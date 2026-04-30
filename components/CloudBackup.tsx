
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  CloudUpload, 
  CheckCircle2, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  LogOut, 
  Sparkles, 
  DownloadCloud, 
  Clock, 
  User, 
  X, 
  ShieldAlert, 
  Mail, 
  Lock, 
  ArrowRight, 
  UserPlus, 
  BellRing, 
  Store, 
  MapPin, 
  Camera, 
  Save,
  Phone,
  FileText,
  ChevronDown,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import { ShopSettings } from '../types';
import { auth, googleProvider, db, isFirebaseConfigured } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { compressImage } from '../imageUtils';
import DriveImage from './DriveImage';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_NAME = 'DokanKhata_Backup';
const IMAGES_FOLDER_NAME = 'Images';

// Helper to get or create a folder in Google Drive
const getOrCreateFolder = async (token: string, folderName: string, parentId?: string) => {
  try {
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentId ? ` and '${parentId}' in parents` : ''}`);
    const response = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Drive search error for ${folderName}:`, errorData);
      
      // Check for specific API disabled error
      if (errorData.error?.message?.includes('Google Drive API has not been used')) {
        throw new Error('DRIVE_API_NOT_ENABLED');
      }
      
      if (response.status === 401) throw new Error('TOKEN_EXPIRED');
      if (response.status === 403) throw new Error('DRIVE_PERMISSION_ERROR');
      return null;
    }

    const result = await response.json();
    
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }

    // Create folder if not found
    const createResponse = await fetch(DRIVE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : []
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error(`Drive folder creation error for ${folderName}:`, errorData);
      
      if (errorData.error?.message?.includes('Google Drive API has not been used')) {
        throw new Error('DRIVE_API_NOT_ENABLED');
      }
      
      if (createResponse.status === 401) throw new Error('TOKEN_EXPIRED');
      if (createResponse.status === 403) throw new Error('DRIVE_PERMISSION_ERROR');
      return null;
    }

    const createResult = await createResponse.json();
    return createResult.id;
  } catch (e: any) {
    if (e.message === 'TOKEN_EXPIRED' || e.message === 'DRIVE_PERMISSION_ERROR' || e.message === 'DRIVE_API_NOT_ENABLED') throw e;
    console.error(`Error managing folder ${folderName}:`, e);
    return null;
  }
};

// Helper to upload a file to a specific folder
const uploadFileToDrive = async (token: string, name: string, mimeType: string, content: any, folderId: string, existingFileId?: string) => {
  try {
    const metadata = {
      name,
      mimeType,
      parents: existingFileId ? undefined : [folderId]
    };

    const boundary = '-------314159265358979323846';
    const firstDelimiter = "--" + boundary + "\r\n";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    let contentPart: Blob;
    let actualMimeType = mimeType;

    if (content instanceof Blob) {
      contentPart = content;
    } else if (typeof content === 'string' && content.startsWith('data:')) {
      const match = content.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        actualMimeType = match[1];
        const byteCharacters = atob(match[2]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        contentPart = new Blob([byteArray], { type: actualMimeType });
      } else {
        // Fallback for weird data URLs
        const resp = await fetch(content);
        contentPart = await resp.blob();
        actualMimeType = contentPart.type || mimeType;
      }
    } else {
      contentPart = new Blob([typeof content === 'string' ? content : JSON.stringify(content)], { type: mimeType });
    }

    const body = new Blob([
      firstDelimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${actualMimeType}\r\n\r\n`,
      contentPart,
      closeDelim
    ]);

    const url = existingFileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    
    const method = existingFileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Upload error for ${name}:`, errorData);
      throw new Error(errorData.error?.message || 'Upload failed');
    }
    const result = await response.json();
    return result.id;
  } catch (e: any) {
    console.error(`Error uploading file ${name}:`, e);
    throw e;
  }
};

// Helper to delete a file from Drive
export const deleteFileFromDrive = async (token: string, fileId: string) => {
  try {
    await fetch(`${DRIVE_API_URL}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    return true;
  } catch (e) {
    console.error(`Error deleting file ${fileId}:`, e);
    return false;
  }
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

export interface UserProfile {
  name: string;
  email: string;
  id: string; 
  photo: string;
  provider: 'google';
}

interface CloudBackupProps {
  onBack: () => void;
  data: any;
  onLoginSuccess: (profile: UserProfile) => void;
  onLogout: () => void;
  onRestore: (data: any, silent?: boolean) => void;
  currentLoggedInState: boolean;
  currentUserProfile: UserProfile | null;
  shopSettings: ShopSettings;
  onUpdateShopSettings: (settings: ShopSettings) => void;
  isAutoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  googleAccessToken: string | null;
  onUpdateGoogleToken: (token: string | null) => void;
}

const CloudBackup: React.FC<CloudBackupProps> = ({ 
  onBack, 
  data, 
  onLoginSuccess, 
  onLogout, 
  onRestore,
  currentLoggedInState, 
  currentUserProfile,
  shopSettings,
  onUpdateShopSettings,
  isAutoSyncEnabled,
  onToggleAutoSync,
  googleAccessToken,
  onUpdateGoogleToken
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(() => localStorage.getItem('dokan_last_sync'));
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentSyncFile, setCurrentSyncFile] = useState<string | null>(null);
  const [hasCloudBackup, setHasCloudBackup] = useState(false);
  const [backupSize, setBackupSize] = useState<string | null>(null);
  const [dataSizeBytes, setDataSizeBytes] = useState<number>(0);
  const [driveStatus, setDriveStatus] = useState<'IDLE' | 'CHECKING' | 'CONNECTED' | 'ERROR' | 'API_DISABLED'>('IDLE');
  const [driveErrorType, setDriveErrorType] = useState<'NONE' | 'PERMISSION' | 'QUOTA' | 'OTHER'>('NONE');
  const [mainFolderId, setMainFolderId] = useState<string | null>(null);

  const [tempShopName, setTempShopName] = useState(shopSettings.shopName === 'গেস্ট' ? '' : shopSettings.shopName);
  const [tempShopAddress, setTempShopAddress] = useState(shopSettings.shopAddress);
  const [tempShopPhone, setTempShopPhone] = useState(shopSettings.shopPhone || '');
  const [tempShopDescription, setTempShopDescription] = useState(shopSettings.shopDescription || '');
  const [tempPaymentMethod, setTempPaymentMethod] = useState(shopSettings.paymentMethod || '');
  const [tempSignatureName, setTempSignatureName] = useState(shopSettings.signatureName || '');
  const [tempTerms, setTempTerms] = useState(shopSettings.termsAndConditions || '');
  const [tempColor, setTempColor] = useState(shopSettings.invoiceColor || '#002147');
  const [tempReminderTemplates, setTempReminderTemplates] = useState<string[]>(shopSettings.reminderTemplates || []);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState('');
  const [tempInvitationTemplates, setTempInvitationTemplates] = useState<string[]>(shopSettings.invitationTemplates || []);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [newInvitationTemplate, setNewInvitationTemplate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentLoggedInState && currentUserProfile) {
      checkCloudBackup(currentUserProfile.id);
    }
  }, [currentLoggedInState, currentUserProfile, googleAccessToken]);

  useEffect(() => {
    // Calculate data size
    const size = new Blob([JSON.stringify(data)]).size;
    setDataSizeBytes(size);
    if (size < 1024) setBackupSize(`${size} B`);
    else if (size < 1024 * 1024) setBackupSize(`${(size / 1024).toFixed(1)} KB`);
    else if (size < 1024 * 1024 * 1024) setBackupSize(`${(size / (1024 * 1024)).toFixed(1)} MB`);
    else setBackupSize(`${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`);
  }, [data]);

  useEffect(() => {
    if (currentLoggedInState && currentUserProfile && isAutoSyncEnabled) {
      const timer = setTimeout(() => {
        handleSyncToCloud(true); // Silent sync
      }, 10000); // Sync after 10s of being on this screen if auto-sync is on
      return () => clearTimeout(timer);
    }
  }, [data, isAutoSyncEnabled]);

  const checkCloudBackup = async (userId: string) => {
    if (!isFirebaseConfigured || !db) return;
    
    setDriveStatus('CHECKING');
    setDriveErrorType('NONE');
    // Check Google Drive first if we have a token
    if (googleAccessToken) {
      try {
        const folderId = await getOrCreateFolder(googleAccessToken, FOLDER_NAME);
        if (folderId) setMainFolderId(folderId);
        
        const file = await findDriveBackup(googleAccessToken);
        if (file) {
          setHasCloudBackup(true);
          setDriveStatus('CONNECTED');
          return;
        } else if (folderId) {
          // Folder exists but no backup file yet
          setDriveStatus('CONNECTED');
          return;
        }
      } catch (e: any) {
        console.error("Drive check failed:", e);
        if (e.message === 'TOKEN_EXPIRED') {
          localStorage.removeItem('google_access_token');
          onUpdateGoogleToken(null);
          setDriveStatus('IDLE');
        } else if (e.message === 'DRIVE_PERMISSION_ERROR') {
          setDriveStatus('ERROR');
          setDriveErrorType('PERMISSION');
        } else if (e.message === 'DRIVE_QUOTA_EXCEEDED') {
          setDriveStatus('ERROR');
          setDriveErrorType('QUOTA');
        } else if (e.message === 'DRIVE_API_NOT_ENABLED') {
          setDriveStatus('API_DISABLED');
        } else {
          setDriveStatus('ERROR');
          setDriveErrorType('OTHER');
        }
      }
    }

    // Fallback to Firestore check
    try {
      const docRef = doc(db, "backups", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setHasCloudBackup(true);
      }
      if (!googleAccessToken) setDriveStatus('IDLE');
    } catch (error) {
      console.error("Error checking backup:", error);
    }
  };

  const findDriveBackup = async (token: string) => {
    try {
      // First find the folder
      const folderId = await getOrCreateFolder(token, FOLDER_NAME);
      if (!folderId) return null;

      const query = encodeURIComponent(`name = 'DokanKhata_Backup.json' and '${folderId}' in parents and trashed = false`);
      const response = await fetch(`${DRIVE_API_URL}?q=${query}&spaces=drive&fields=files(id, name, modifiedTime, size)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      return result.files?.[0];
    } catch (e) {
      console.error("Error finding Drive backup:", e);
      return null;
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured || !auth) {
      alert('Firebase কনফিগার করা নেই। অনুগ্রহ করে সেটিংস থেকে API Key সেট করুন।');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (token) {
        onUpdateGoogleToken(token);
        localStorage.setItem('google_access_token', token);
        // Immediately create backup folder on login as requested
        try {
          const folderId = await getOrCreateFolder(token, FOLDER_NAME);
          if (folderId) setMainFolderId(folderId);
        } catch (folderError: any) {
          console.error("Initial folder creation failed:", folderError);
          if (folderError.message === 'DRIVE_API_NOT_ENABLED') {
            setDriveStatus('API_DISABLED');
          } else {
            setDriveStatus('ERROR');
          }
        }
      }

      const user = result.user;
      const profile: UserProfile = {
        name: user.displayName || 'User',
        email: user.email || '',
        id: user.uid,
        photo: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
        provider: 'google'
      };
      onLoginSuccess(profile, token);
      await checkCloudBackup(user.uid);
    } catch (error: any) {
      // Don't log or show alert if user just closed the popup or cancelled
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error("Login failed:", error);
      alert('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isFirebaseConfigured && auth) {
        await signOut(auth);
      }
      localStorage.removeItem('google_access_token');
      onUpdateGoogleToken(null);
      onLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSyncToCloud = async (silent = false) => {
    if (!currentUserProfile) return;
    
    if (!navigator.onLine) {
      if (!silent) alert('আপনার ইন্টারনেট কানেকশন নেই। দয়া করে ইন্টারনেট চেক করুন।');
      return;
    }

    // Check if data is too large for Firestore (1MB limit)
    const isTooLargeForFirestore = dataSizeBytes > 900000; // ~0.9MB safety margin
    
    if (isTooLargeForFirestore && !googleAccessToken) {
      const confirmLogin = window.confirm('আপনার ব্যাকআপ ফাইলটি ১ মেগাবাইটের বেশি। এটি সুরক্ষিত রাখতে গুগল ড্রাইভ কানেক্ট করা প্রয়োজন। আপনি কি এখন গুগল ড্রাইভ কানেক্ট করতে চান?');
      if (confirmLogin) {
        handleGoogleLogin();
        return;
      }
    }

    if (!silent) {
      setIsSyncing(true);
      setSyncProgress(0);
      setCurrentSyncFile('ব্যাকআপ শুরু হচ্ছে...');
    }
    setSyncSuccess(false);
    
    let progressInterval: any = null;
    try {
      const now = new Date().toLocaleString('bn-BD');
      let driveSuccess = false;

      // Simulate progress
      if (!silent) {
        progressInterval = setInterval(() => {
          setSyncProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 15;
          });
        }, 300);
      }

      // Try Google Drive Backup first if token exists
      if (googleAccessToken) {
        try {
          // 1. Get or Create Main Folder
          if (!silent) setCurrentSyncFile('ফোল্ডার চেক করা হচ্ছে...');
          const folderId = await getOrCreateFolder(googleAccessToken, FOLDER_NAME);
          if (!folderId) throw new Error('FOLDER_CREATION_FAILED');
          setMainFolderId(folderId);
          if (!silent) setSyncProgress(20);

          // 2. Get or Create Images Folder
          const imagesFolderId = await getOrCreateFolder(googleAccessToken, IMAGES_FOLDER_NAME, folderId);
          if (!imagesFolderId) throw new Error('IMAGES_FOLDER_CREATION_FAILED');
          if (!silent) setSyncProgress(30);

          // 3. Sync Images (Stock Items)
          const updatedStockItems = [];
          const totalItems = data.stockItems.length;
          for (let i = 0; i < totalItems; i++) {
            const item = data.stockItems[i];
            if (item.image && item.image.startsWith('data:image')) {
              if (!silent) setCurrentSyncFile(`পণ্য আপলোড: ${item.name || item.id}`);
              const fileName = `product_${item.id}.jpg`;
              const fileId = await uploadFileToDrive(googleAccessToken, fileName, 'image/jpeg', item.image, imagesFolderId);
              if (fileId) {
                updatedStockItems.push({ ...item, image: `drive://${fileId}` });
              } else {
                updatedStockItems.push(item);
              }
            } else {
              updatedStockItems.push(item);
            }
            if (!silent) setSyncProgress(30 + (i / totalItems) * 20);
          }

          // 4. Sync Images (Sale Purchase Records)
          const updatedRecords = [];
          const totalRecords = data.salePurchaseRecords.length;
          for (let i = 0; i < totalRecords; i++) {
            const record = data.salePurchaseRecords[i];
            if (record.invoiceImage && record.invoiceImage.startsWith('data:image')) {
              if (!silent) setCurrentSyncFile(`ইনভয়েস আপলোড: ${record.id}`);
              const fileName = `invoice_${record.id}.jpg`;
              const fileId = await uploadFileToDrive(googleAccessToken, fileName, 'image/jpeg', record.invoiceImage, imagesFolderId);
              if (fileId) {
                updatedRecords.push({ ...record, invoiceImage: `drive://${fileId}` });
              } else {
                updatedRecords.push(record);
              }
            } else {
              updatedRecords.push(record);
            }
            if (!silent) setSyncProgress(50 + (i / totalRecords) * 20);
          }

          // 5. Sync Images (Contacts)
          const updatedContacts = [];
          const totalContacts = data.contacts.length;
          for (let i = 0; i < totalContacts; i++) {
            const contact = data.contacts[i];
            if (contact.photo && contact.photo.startsWith('data:image')) {
              if (!silent) setCurrentSyncFile(`কন্টাক্ট ফটো: ${contact.name || contact.id}`);
              const fileName = `contact_${contact.id}.jpg`;
              const fileId = await uploadFileToDrive(googleAccessToken, fileName, 'image/jpeg', contact.photo, imagesFolderId);
              if (fileId) {
                updatedContacts.push({ ...contact, photo: `drive://${fileId}` });
              } else {
                updatedContacts.push(contact);
              }
            } else {
              updatedContacts.push(contact);
            }
            if (!silent) setSyncProgress(70 + (i / totalContacts) * 10);
          }

          // 6. Sync Shop Logo
          let updatedShopSettings = { ...data.shopSettings };
          if (data.shopSettings.shopLogo && data.shopSettings.shopLogo.startsWith('data:image')) {
            if (!silent) setCurrentSyncFile('দোকান লোগো আপলোড হচ্ছে...');
            const fileName = `shop_logo_${Date.now()}.jpg`;
            const fileId = await uploadFileToDrive(googleAccessToken, fileName, 'image/jpeg', data.shopSettings.shopLogo, imagesFolderId);
            if (fileId) {
              updatedShopSettings.shopLogo = `drive://${fileId}`;
            }
          }

          // 7. Prepare final data with Drive references
          if (!silent) setCurrentSyncFile('ব্যাকআপ ফাইল তৈরি হচ্ছে...');
          const finalData = {
            ...data,
            stockItems: updatedStockItems,
            salePurchaseRecords: updatedRecords,
            contacts: updatedContacts,
            shopSettings: updatedShopSettings
          };

          // Update local state with drive links immediately
          onRestore(finalData, true);

          // 6. Upload JSON Backup to Main Folder
          if (!silent) setCurrentSyncFile('ড্রাইভে সেভ করা হচ্ছে...');
          const existingFile = await findDriveBackup(googleAccessToken);
          const metadata = {
            name: 'DokanKhata_Backup.json',
            mimeType: 'application/json',
            parents: existingFile ? undefined : [folderId]
          };

          const boundary = '-------314159265358979323846';
          const delimiter = "\r\n--" + boundary + "\r\n";
          const close_delim = "\r\n--" + boundary + "--";

          // Use Blob for the main backup file as well
          const metadataPart = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
          const contentPart = new Blob([JSON.stringify(finalData)], { type: 'application/json' });

          const body = new Blob([
            delimiter,
            'Content-Type: application/json\r\n\r\n',
            metadataPart,
            delimiter,
            'Content-Type: application/json\r\n\r\n',
            contentPart,
            close_delim
          ]);

          const url = existingFile 
            ? `${UPLOAD_API_URL}/${existingFile.id}?uploadType=multipart`
            : `${UPLOAD_API_URL}?uploadType=multipart`;
          
          const method = existingFile ? 'PATCH' : 'POST';

          const response = await fetch(url, {
            method,
            headers: {
              'Authorization': `Bearer ${googleAccessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
          });

          if (!response.ok) {
            const err = await response.json();
            console.error("Google Drive API Error Details:", err);
            if (err.error?.code === 401) {
              throw new Error('TOKEN_EXPIRED');
            }
            // If it's a 403 or 404, it might be a permission issue or the folder was deleted
            if (err.error?.code === 403 || err.error?.code === 404) {
              throw new Error('DRIVE_PERMISSION_ERROR');
            }
            throw new Error(`DRIVE_UPLOAD_FAILED: ${err.error?.message || response.statusText}`);
          }
          driveSuccess = true;
          if (!silent) setSyncProgress(95);
        } catch (driveError: any) {
          if (driveError.message === 'TOKEN_EXPIRED') {
            if (!silent) alert('গুগল ড্রাইভ সেশন শেষ হয়ে গেছে। দয়া করে আবার লগইন করুন।');
            localStorage.removeItem('google_access_token');
            onUpdateGoogleToken(null);
            return;
          }
          if (driveError.message === 'DRIVE_QUOTA_EXCEEDED') {
            if (!silent) alert('আপনার গুগল ড্রাইভের স্টোরেজ ফুল হয়ে গেছে! দয়া করে কিছু ফাইল ডিলিট করে জায়গা খালি করুন।');
            setDriveStatus('ERROR');
            setDriveErrorType('QUOTA');
            return;
          }
          if (driveError.message === 'DRIVE_PERMISSION_ERROR') {
            if (!silent) alert('গুগল ড্রাইভ পারমিশন সমস্যা দেখা দিয়েছে। দয়া করে ডিসকানেক্ট করে আবার কানেক্ট করুন এবং লগইন করার সময় বক্সে টিক চিহ্ন দিন।');
            setDriveStatus('ERROR');
            setDriveErrorType('PERMISSION');
            return;
          }
          if (driveError.message === 'DRIVE_API_NOT_ENABLED') {
            if (!silent) alert('আপনার গুগল ক্লাউড কনসোলে "Google Drive API" টি চালু করা নেই। দয়া করে এটি চালু করুন।');
            setDriveStatus('ERROR');
            return;
          }
          if (driveError.message === 'FOLDER_CREATION_FAILED') {
            if (!silent) alert('গুগল ড্রাইভে ফোল্ডার তৈরি করতে ব্যর্থ হয়েছে। দয়া করে গুগল ড্রাইভ ডিসকানেক্ট করে আবার কানেক্ট করুন।');
            setDriveStatus('ERROR');
            return;
          }
          console.error("Google Drive sync failed, falling back to Firestore:", driveError);
        }
      }

      // Sync to Firestore as secondary backup (or primary if Drive fails/not connected)
      // Only if data is small enough
      if (isFirebaseConfigured && db && !isTooLargeForFirestore) {
        try {
          const docRef = doc(db, "backups", currentUserProfile.id);
          await setDoc(docRef, {
            data: data,
            lastSynced: now,
            userId: currentUserProfile.id,
            userEmail: currentUserProfile.email
          });
        } catch (firestoreError) {
          console.error("Firestore backup failed:", firestoreError);
          if (!driveSuccess) throw firestoreError;
        }
      } else if (isTooLargeForFirestore && !driveSuccess) {
        throw new Error('DATA_TOO_LARGE_AND_DRIVE_FAILED');
      }
      
      localStorage.setItem('dokan_last_sync', now);
      setLastSynced(now);
      
      if (!silent) {
        if (progressInterval) clearInterval(progressInterval);
        setSyncProgress(100);
        setCurrentSyncFile('ব্যাকআপ সফল হয়েছে!');
        setTimeout(() => {
          setSyncSuccess(true);
          setBackupSize(null); // Hide size after success as requested
          setCurrentSyncFile(null);
        }, 500);
      }
      
      setHasCloudBackup(true);
      if (!silent) setTimeout(() => {
        setSyncSuccess(false);
        setSyncProgress(0);
      }, 5000);
    } catch (error: any) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Sync failed:", error);
      if (!silent) {
        if (error.message === 'DATA_TOO_LARGE_AND_DRIVE_FAILED') {
          alert('আপনার ব্যাকআপ ফাইলটি অনেক বড় (১ মেগাবাইটের বেশি) এবং গুগল ড্রাইভ ব্যাকআপ ব্যর্থ হয়েছে। দয়া করে গুগল ড্রাইভ ডিসকানেক্ট করে আবার কানেক্ট করুন। গুগল ড্রাইভে ১ জিবি পর্যন্ত ফাইল সহজেই ব্যাকআপ রাখা যায়।');
        } else {
          alert('ব্যাকআপ ব্যর্থ হয়েছে। আপনার ইন্টারনেট কানেকশন বা গুগল ড্রাইভ পারমিশন চেক করুন। বড় ফাইলের ক্ষেত্রে গুগল ড্রাইভ কানেক্ট থাকা জরুরি।');
        }
      }
    } finally {
      if (!silent) {
        setIsSyncing(false);
        setCurrentSyncFile(null);
      }
    }
  };

  const handleLoadFromCloud = async (silent = false) => {
    if (!currentUserProfile) return;
    if (!silent) setIsRestoring(true);
    
    try {
      let cloudData = null;

      // Try Google Drive first
      if (googleAccessToken) {
        try {
          const file = await findDriveBackup(googleAccessToken);
          if (file) {
            const response = await fetch(`${DRIVE_API_URL}/${file.id}?alt=media`, {
              headers: { Authorization: `Bearer ${googleAccessToken}` }
            });
            if (response.ok) {
              cloudData = await response.json();
              console.log("Restored from Google Drive");
            } else if (response.status === 401) {
              throw new Error('TOKEN_EXPIRED');
            }
          }
        } catch (driveError: any) {
          if (driveError.message === 'TOKEN_EXPIRED') {
            if (!silent) alert('সেশন শেষ হয়ে গেছে। দয়া করে আবার লগইন করুন।');
            handleLogout();
            return;
          }
          console.error("Drive restore failed, trying Firestore:", driveError);
        }
      }

      // Fallback to Firestore
      if (!cloudData && isFirebaseConfigured && db) {
        const docRef = doc(db, "backups", currentUserProfile.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          cloudData = docSnap.data().data;
          console.log("Restored from Firestore");
        }
      }

      if (cloudData) {
        onRestore(cloudData, silent);
        if (!silent) alert('সফলভাবে সর্বশেষ ব্যাকআপ ফিরে আনা হয়েছে।');
      } else {
        if (!silent) alert('কোনো ব্যাকআপ ফাইল পাওয়া যায়নি।');
      }
    } catch (error) {
      console.error("Restore failed:", error);
      if (!silent) alert('রিস্টোর ব্যর্থ হয়েছে।');
    } finally {
      if (!silent) setIsRestoring(false);
    }
  };

  const handleSaveSettings = () => {
    onUpdateShopSettings({
      ...shopSettings,
      shopName: tempShopName || 'গেস্ট',
      shopAddress: tempShopAddress,
      shopPhone: tempShopPhone,
      shopDescription: tempShopDescription,
      paymentMethod: tempPaymentMethod,
      signatureName: tempSignatureName,
      termsAndConditions: tempTerms,
      invoiceColor: tempColor,
      reminderTemplates: tempReminderTemplates,
      invitationTemplates: tempInvitationTemplates
    });
    alert('সেটিংস সফলভাবে সেভ হয়েছে!');
  };

  const addTemplate = () => {
    if (!newTemplate.trim()) return;
    setTempReminderTemplates([...tempReminderTemplates, newTemplate.trim()]);
    setNewTemplate('');
  };

  const removeTemplate = (index: number) => {
    setTempReminderTemplates(tempReminderTemplates.filter((_, i) => i !== index));
  };

  const addInvitationTemplate = () => {
    if (!newInvitationTemplate.trim()) return;
    setTempInvitationTemplates([...tempInvitationTemplates, newInvitationTemplate.trim()]);
    setNewInvitationTemplate('');
  };

  const removeInvitationTemplate = (index: number) => {
    setTempInvitationTemplates(tempInvitationTemplates.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        onUpdateShopSettings({
          ...shopSettings,
          shopLogo: compressed
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl font-bold text-sm shadow-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-50 transition-all placeholder:text-gray-400 text-gray-900";

  const renderChoiceScreen = () => (
    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-red-100 mb-8 relative">
        <CloudUpload size={48} className="text-red-600" />
        <div className="absolute -top-1 -right-1 bg-blue-500 p-2 rounded-xl border-2 border-white shadow-lg">
          <ShieldCheck size={16} className="text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-black text-gray-900 mb-3">ডাটা ব্যাকআপ ও সিকিউরিটি</h3>
      {!isFirebaseConfigured && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-700 text-xs font-bold">
          Firebase কনফিগার করা নেই। অনুগ্রহ করে সেটিংস থেকে API Key সেট করুন।
        </div>
      )}
      <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
        আপনার জিমেইল দিয়ে লগইন করে ক্লাউডে সব ডাটা সুরক্ষিত রাখুন। ফোন হারালেও ডাটা হারাবে না।
      </p>
      <button 
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full py-4.5 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center gap-4 shadow-sm active:scale-95 transition-all hover:bg-gray-50 hover:border-blue-200"
      >
        {isLoading ? <RefreshCw className="animate-spin text-blue-600" /> : <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="g" />}
        <span className="font-black text-gray-700">Sign in with Google</span>
      </button>

      {window.self !== window.top && (
        <p className="mt-6 text-[10px] text-gray-400 font-bold leading-relaxed">
          নিরাপত্তার কারণে আইফ্রেমের ভেতর থেকে গুগল লগইন করতে সমস্যা হতে পারে। যদি লগইন না হয়, তবে অ্যাপটি <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">নতুন ট্যাবে ওপেন</a> করে চেষ্টা করুন।
        </p>
      )}
    </div>
  );

  const renderLoggedInView = () => (
    <div className="flex-1 p-6 flex flex-col items-center animate-in fade-in duration-500 overflow-y-auto no-scrollbar">
      <div className="relative group mb-8">
        <div className={`w-32 h-32 rounded-[2.8rem] bg-red-50 flex items-center justify-center relative border-4 border-white shadow-2xl overflow-hidden`}>
           {shopSettings.shopLogo ? (
             <DriveImage src={shopSettings.shopLogo} className="w-full h-full object-cover" alt="Profile" token={googleAccessToken} />
           ) : (
             <Store size={48} className="text-red-600" />
           )}
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-2 -right-2 bg-[#D32F2F] text-white p-3 rounded-2xl shadow-lg border-2 border-white hover:scale-110 active:scale-95 transition-all"
        >
          <Camera size={20} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
      </div>

      <h3 className="text-xl font-black text-gray-900 mb-8">দোকান ও প্রোফাইল সেটিংস</h3>
      
      <div className="w-full bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-blue-600" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">অটোমেটিক ব্যাকআপ</span>
          </div>
          <button 
            onClick={() => onToggleAutoSync(!isAutoSyncEnabled)}
            className={`w-10 h-5 rounded-full relative transition-all ${isAutoSyncEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAutoSyncEnabled ? 'right-1' : 'left-1'}`}></div>
          </button>
        </div>
        <p className="text-[9px] text-blue-500 font-bold leading-tight">
          * এটি চালু থাকলে আপনার ডাটা পরিবর্তন হওয়ার সাথে সাথে অটোমেটিক ব্যাকআপ হবে।
        </p>
        {isAutoSyncEnabled && lastSynced && (
          <div className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest animate-in fade-in duration-500">
            <Clock size={10} />
            <span>সর্বশেষ ব্যাকআপ: {lastSynced}</span>
          </div>
        )}
      </div>

      <div 
        onClick={() => driveStatus !== 'CONNECTED' && handleGoogleLogin()}
        className={`w-full p-4 rounded-2xl mb-6 border transition-all cursor-pointer active:scale-[0.98] ${
          driveStatus === 'CONNECTED' 
            ? 'bg-green-50 border-green-100' 
            : driveStatus === 'ERROR' 
              ? 'bg-red-50 border-red-100' 
              : 'bg-blue-50 border-blue-100 hover:bg-blue-100'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              driveStatus === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 
              driveStatus === 'CHECKING' ? 'bg-yellow-500 animate-spin' : 
              driveStatus === 'ERROR' || driveStatus === 'API_DISABLED' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              driveStatus === 'CONNECTED' ? 'text-green-700' : 'text-blue-700'
            }`}>Google Drive Status</span>
          </div>
          <span className={`text-[10px] font-black ${
            driveStatus === 'CONNECTED' ? 'text-green-600' : 'text-blue-600'
          }`}>
            {driveStatus === 'CONNECTED' ? 'সংযুক্ত' : 
             driveStatus === 'CHECKING' ? 'চেক করা হচ্ছে...' : 
             driveStatus === 'API_DISABLED' ? 'API বন্ধ' :
             driveStatus === 'ERROR' ? 'ত্রুটি (পুনরায় চেষ্টা করুন)' : 'সংযুক্ত নেই (ক্লিক করুন)'}
          </span>
        </div>
        
        {driveStatus === 'CONNECTED' && (
          <button 
            onClick={() => handleLoadFromCloud(false)}
            disabled={isRestoring}
            className="w-full mt-4 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {isRestoring ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <DownloadCloud size={18} />
            )}
            সব ডাটা ও ছবি সিঙ্ক করুন
          </button>
        )}

        {driveStatus === 'ERROR' && driveErrorType === 'PERMISSION' && (
          <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
            <p className="text-[9px] text-red-700 font-black leading-tight">
              ⚠️ গুগল ড্রাইভ পারমিশন সমস্যা! লগ আউট করে আবার লগইন করুন এবং লগইন করার সময় "See, edit, create, and delete..." লেখাটির পাশের বক্সে অবশ্যই **টিক চিহ্ন** দিন।
            </p>
          </div>
        )}
        {driveStatus === 'ERROR' && driveErrorType === 'QUOTA' && (
          <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
            <p className="text-[9px] text-red-700 font-black leading-tight">
              ⚠️ আপনার গুগল ড্রাইভের স্টোরেজ ফুল হয়ে গেছে! দয়া করে ড্রাইভ থেকে অপ্রয়োজনীয় ফাইল ডিলিট করে জায়গা খালি করুন।
            </p>
          </div>
        )}
        {driveStatus === 'API_DISABLED' && (
          <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
            <p className="text-[9px] text-red-700 font-black leading-tight">
              ⚠️ আপনার গুগল ক্লাউড প্রজেক্টে "Google Drive API" টি চালু করা নেই। এটি চালু না করলে ড্রাইভ ব্যাকআপ কাজ করবে না।
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ব্যাকআপ সাইজ (বর্তমান)</span>
          <span className="text-xs font-black text-gray-700">
            {syncSuccess ? (
              <span className="text-green-600 flex items-center gap-1 animate-in zoom-in-95 duration-300">
                <CheckCircle2 size={12} /> ব্যাকআপ কমপ্লিট
              </span>
            ) : (
              backupSize || 'Calculating...'
            )}
          </span>
        </div>
        <p className="text-[9px] text-blue-500 font-bold mt-2 leading-tight">
          * গুগল ড্রাইভে আনলিমিটেড সাইজের ব্যাকআপ রাখা যাবে। সব ছবি ও ফাইল সুরক্ষিত থাকবে। ব্যাকআপ সাইজ কমানোর প্রয়োজন নেই, ড্রাইভ স্বয়ংক্রিয়ভাবে বড় ফাইল ম্যানেজ করে।
        </p>
        
        {driveStatus === 'CONNECTED' && mainFolderId && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://drive.google.com/drive/folders/${mainFolderId}`, '_blank');
            }}
            className="mt-3 w-full py-2.5 bg-white border border-green-200 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-green-700 hover:bg-green-50 transition-all active:scale-95"
          >
            <Store size={14} className="text-green-600" />
            গুগল ড্রাইভ ফোল্ডার দেখুন
          </button>
        )}
      </div>

      <div className="w-full space-y-4 mb-8">
        <div className="relative">
           <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
            type="text" 
            placeholder="দোকানের নাম লিখুন" 
            value={tempShopName}
            onChange={(e) => setTempShopName(e.target.value)}
            className={inputClasses}
           />
        </div>
        <div className="relative">
           <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
            type="text" 
            placeholder="দোকানের ঠিকানা" 
            value={tempShopAddress}
            onChange={(e) => setTempShopAddress(e.target.value)}
            className={inputClasses}
           />
        </div>
        <div className="relative">
           <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
            type="tel" 
            placeholder="দোকানের ফোন নম্বর" 
            value={tempShopPhone}
            onChange={(e) => setTempShopPhone(e.target.value)}
            className={inputClasses}
           />
        </div>

        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mt-6 mb-2">ক্যাশ মেমো কাস্টমাইজেশন</div>
        
        <div className="relative">
           <div className="absolute left-4 top-4 text-gray-400"><FileText size={18} /></div>
           <textarea 
            placeholder="ছোট ডিসক্রিপশন (কি কি বিক্রি করেন)" 
            value={tempShopDescription}
            onChange={(e) => setTempShopDescription(e.target.value)}
            className={`${inputClasses} h-24 pt-4 resize-none`}
           />
        </div>

        <div className="relative">
           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Database size={18} /></div>
           <input 
            type="text" 
            placeholder="Payment Method (যেমন: Bank Name, A/C No)" 
            value={tempPaymentMethod}
            onChange={(e) => setTempPaymentMethod(e.target.value)}
            className={inputClasses}
           />
        </div>

        <div className="relative">
           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><User size={18} /></div>
           <input 
            type="text" 
            placeholder="Signature Name (যেমন: Administrator)" 
            value={tempSignatureName}
            onChange={(e) => setTempSignatureName(e.target.value)}
            className={inputClasses}
           />
        </div>

        <div className="relative">
           <div className="absolute left-4 top-4 text-gray-400"><ShieldAlert size={18} /></div>
           <textarea 
            placeholder="Terms and Conditions" 
            value={tempTerms}
            onChange={(e) => setTempTerms(e.target.value)}
            className={`${inputClasses} h-24 pt-4 resize-none`}
           />
        </div>

        <div className="flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-gray-500 flex-1">মেমো থিম কালার:</div>
          <input 
            type="color" 
            value={tempColor}
            onChange={(e) => setTempColor(e.target.value)}
            className="w-12 h-10 rounded-lg cursor-pointer border-none bg-transparent"
          />
        </div>

        {/* Manual Reminder Templates Section */}
        <div className="w-full border-2 border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button 
            onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} className="text-purple-600" />
              <span className="text-sm font-black text-gray-900">ম্যানুয়াল রিমাইন্ডার মেসেজ</span>
            </div>
            <ChevronDown size={20} className={`text-gray-400 transition-transform ${isTemplatesOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isTemplatesOpen && (
            <div className="p-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 font-bold leading-tight">
                  * এখানে আপনি আপনার পছন্দমতো মেসেজ লিখে রাখতে পারেন। রিমাইন্ডার পাঠানোর সময় এআই-এর বদলে এখান থেকে সিরিয়াল অনুযায়ী মেসেজ পাঠানো হবে।
                </p>
                <p className="text-[10px] text-purple-600 font-black leading-tight">
                  টিপস: মেসেজে কাস্টমারের নাম দিতে <span className="bg-purple-50 px-1 rounded">{"{নাম}"}</span> এবং বকেয়া টাকার জন্য <span className="bg-purple-50 px-1 rounded">{"{বকেয়া}"}</span> ব্যবহার করুন। কিছু না দিলেও অটোমেটিক নাম ও বকেয়া যুক্ত হবে।
                </p>
              </div>
              
              <div className="space-y-2">
                {tempReminderTemplates.map((template, index) => (
                  <div key={index} className="flex gap-2 group">
                    <div className="flex-1 p-3 bg-gray-50 rounded-xl text-xs font-medium text-gray-700 border border-gray-100">
                      {template}
                    </div>
                    <button 
                      onClick={() => removeTemplate(index)}
                      className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                {tempReminderTemplates.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-xs font-medium italic">
                    কোনো মেসেজ যুক্ত করা নেই
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="নতুন মেসেজ লিখুন..." 
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTemplate()}
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-purple-600 transition-all"
                />
                <button 
                  onClick={addTemplate}
                  className="p-3 bg-purple-600 text-white rounded-xl active:scale-90 transition-all shadow-lg shadow-purple-100"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Manual Invitation Templates Section */}
        <div className="w-full border-2 border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button 
            onClick={() => setIsInvitationsOpen(!isInvitationsOpen)}
            className="w-full p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} className="text-blue-600" />
              <span className="text-sm font-black text-gray-900">ম্যানুয়াল আমন্ত্রণ মেসেজ</span>
            </div>
            <ChevronDown size={20} className={`text-gray-400 transition-transform ${isInvitationsOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isInvitationsOpen && (
            <div className="p-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400 font-bold leading-tight">
                  * এখানে আপনি আপনার পছন্দমতো আমন্ত্রণ মেসেজ লিখে রাখতে পারেন। যাদের বকেয়া নেই তাদের আমন্ত্রণ পাঠানোর সময় এখান থেকে সিরিয়াল অনুযায়ী মেসেজ পাঠানো হবে।
                </p>
                <p className="text-[10px] text-blue-600 font-black leading-tight">
                  টিপস: মেসেজে কাস্টমারের নাম দিতে <span className="bg-blue-50 px-1 rounded">{"{নাম}"}</span> ব্যবহার করুন। কিছু না দিলেও অটোমেটিক নাম যুক্ত হবে।
                </p>
              </div>
              
              <div className="space-y-2">
                {tempInvitationTemplates.map((template, index) => (
                  <div key={index} className="flex gap-2 group">
                    <div className="flex-1 p-3 bg-gray-50 rounded-xl text-xs font-medium text-gray-700 border border-gray-100">
                      {template}
                    </div>
                    <button 
                      onClick={() => removeInvitationTemplate(index)}
                      className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                {tempInvitationTemplates.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-xs font-medium italic">
                    কোনো মেসেজ যুক্ত করা নেই
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="নতুন আমন্ত্রণ মেসেজ লিখুন..." 
                  value={newInvitationTemplate}
                  onChange={(e) => setNewInvitationTemplate(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addInvitationTemplate()}
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
                />
                <button 
                  onClick={addInvitationTemplate}
                  className="p-3 bg-blue-600 text-white rounded-xl active:scale-90 transition-all shadow-lg shadow-blue-100"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleSaveSettings}
          className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-100"
        >
          <Save size={18} /> তথ্য আপডেট করুন
        </button>
      </div>

      <div className="w-full h-px bg-gray-100 mb-8"></div>

      <div className="w-full space-y-4 mb-10">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-2">ব্যাকআপ ও রিস্টোর</div>
        {hasCloudBackup && (
          <button 
            onClick={handleLoadFromCloud}
            disabled={isRestoring || isSyncing}
            className="w-full bg-blue-600 text-white p-5 rounded-[1.8rem] flex items-center justify-center gap-4 shadow-xl shadow-blue-100 active:scale-95 transition-all"
          >
            {isRestoring ? <RefreshCw className="animate-spin" /> : <DownloadCloud size={24} />}
            <span className="font-black text-lg">আগের ব্যাকআপ ফিরে আনুন</span>
          </button>
        )}
        <button 
          onClick={() => handleSyncToCloud()}
          disabled={isSyncing || isRestoring}
          className={`w-full py-5 rounded-[1.8rem] font-black text-lg text-white shadow-xl flex flex-col items-center justify-center gap-1 transition-all ${
            syncSuccess ? 'bg-green-600 shadow-green-100 scale-[1.02]' : 
            isSyncing ? 'bg-gray-400' : 'bg-[#D32F2F] shadow-red-100 active:scale-95'
          }`}
        >
          <div className="flex items-center gap-4">
            {isSyncing ? <RefreshCw className="animate-spin" /> : syncSuccess ? <CheckCircle2 size={24} /> : <CloudUpload size={24} />}
            <span>{isSyncing ? 'ব্যাকআপ হচ্ছে...' : syncSuccess ? 'ব্যাকআপ কমপ্লিট!' : 'নতুন ব্যাকআপ নিন'}</span>
          </div>
          
          {isSyncing && (
            <div className="w-full px-8 flex flex-col items-center gap-2 mt-2">
              {currentSyncFile && (
                <div className="text-[10px] font-bold text-white/90 animate-pulse truncate max-w-full">
                  {currentSyncFile}
                </div>
              )}
              <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-300" 
                  style={{ width: `${syncProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </button>
        {lastSynced && <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">সর্বশেষ ব্যাকআপ: {lastSynced}</p>}
      </div>

      <button 
        onClick={handleLogout} 
        className="w-full py-4 rounded-2xl border-2 border-red-50 text-red-600 font-black flex items-center justify-center gap-3 active:scale-95"
      >
        <LogOut size={20} /> লগ আউট
      </button>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-full flex flex-col relative overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 p-1 active:scale-90 transition-all"><ArrowLeft size={24} /></button>
          <h2 className="text-lg font-black text-gray-900">সেটিংস ও প্রোফাইল</h2>
        </div>
      </header>
      {!currentLoggedInState ? renderChoiceScreen() : renderLoggedInView()}
    </div>
  );
};

export default CloudBackup;
