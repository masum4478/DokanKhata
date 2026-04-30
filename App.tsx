
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Wallet, 
  Menu, 
  BookOpen, 
  Search, 
  UserPlus, 
  Plus, 
  Minus, 
  ArrowLeft, 
  MoreVertical, 
  Calendar, 
  Camera, 
  ChevronRight,
  Filter,
  Download,
  Package,
  FileText,
  Bell,
  HelpCircle,
  QrCode,
  CloudUpload,
  MessageSquare,
  ChevronDown,
  Sparkles,
  Store,
  RefreshCw
} from 'lucide-react';
import { Contact, ContactType, ViewState, Transaction, SalePurchaseRecord, StockItem, StockTransaction, ShopSettings } from './types';
import { GoogleGenAI } from "@google/genai";
import TallyView from './components/TallyView';
import CashboxView from './components/CashboxView';
import AddContactForm from './components/AddContactForm';
import ContactDetails from './components/ContactDetails';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import BechaKenaView from './components/BechaKenaView';
import CloudBackup, { UserProfile, deleteFileFromDrive } from './components/CloudBackup';
import AIChatView, { Message } from './components/AIChatView';
import SmartRecommendationsView from './components/SmartRecommendationsView';
import StockView from './components/StockView';
import SaleEntryView from './components/SaleEntryView';
import ProductReturnView from './components/ProductReturnView';
import HelpSupportView from './components/HelpSupportView';
import DriveImage from './components/DriveImage';
import { findDriveBackup, getDriveFileContent } from './services/driveService';
import { db, isFirebaseConfigured, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const HELP_WHATSAPP_URL = 'https://wa.me/8801797464478';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('TALLY');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const autoRestoreAttempted = React.useRef(false);

  const defaultShopSettings: ShopSettings = { shopName: 'গেস্ট', shopAddress: '', shopPhone: '' };

  const [shopSettings, setShopSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('dokan_shop_settings');
    return saved ? JSON.parse(saved) : defaultShopSettings;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => localStorage.getItem('google_access_token'));

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('dokan_contacts');
    return saved ? JSON.parse(saved) : [];
  });

  const [salePurchaseRecords, setSalePurchaseRecords] = useState<SalePurchaseRecord[]>(() => {
    const saved = localStorage.getItem('dokan_becha_kena');
    return saved ? JSON.parse(saved) : [];
  });

  const [stockItems, setStockItems] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('dokan_stock');
    return saved ? JSON.parse(saved) : [];
  });

  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(() => {
    const saved = localStorage.getItem('dokan_stock_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dokan_auto_sync') === 'true';
  });

  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<number>(0);

  const safeSaveToLocalStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`Failed to save to localStorage for key: ${key}`, e);
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        alert('আপনার ফোনের মেমোরি পূর্ণ হয়ে গেছে। দয়া করে কিছু অপ্রয়োজনীয় ছবি বা ডাটা মুছে ফেলুন অথবা গুগল ড্রাইভ ব্যাকআপ ব্যবহার করুন।');
      }
    }
  };

  useEffect(() => {
    safeSaveToLocalStorage('dokan_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    safeSaveToLocalStorage('dokan_becha_kena', JSON.stringify(salePurchaseRecords));
  }, [salePurchaseRecords]);

  useEffect(() => {
    safeSaveToLocalStorage('dokan_stock', JSON.stringify(stockItems));
    safeSaveToLocalStorage('dokan_stock_transactions', JSON.stringify(stockTransactions));
  }, [stockItems, stockTransactions]);

  useEffect(() => {
    safeSaveToLocalStorage('dokan_shop_settings', JSON.stringify(shopSettings));
  }, [shopSettings]);

  const toggleAutoSync = (enabled: boolean) => {
    setIsAutoSyncEnabled(enabled);
    safeSaveToLocalStorage('dokan_auto_sync', enabled.toString());
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        setUser({
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          id: firebaseUser.uid,
          photo: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email}`,
          provider: 'google'
        });
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  const [geminiUsageCount, setGeminiUsageCount] = useState<number>(() => {
    const saved = localStorage.getItem('dokan_gemini_usage');
    const lastReset = localStorage.getItem('dokan_gemini_last_reset');
    const today = new Date().toDateString();

    if (lastReset !== today) {
      localStorage.setItem('dokan_gemini_last_reset', today);
      localStorage.setItem('dokan_gemini_usage', '0');
      return 0;
    }
    return saved ? parseInt(saved, 10) : 0;
  });

  const incrementGeminiUsage = () => {
    setGeminiUsageCount(prev => {
      const newCount = prev + 1;
      safeSaveToLocalStorage('dokan_gemini_usage', newCount.toString());
      return newCount;
    });
  };

  const [aiMessages, setAiMessages] = useState<Message[]>([
    { 
      role: 'ai', 
      text: 'আসসালামু আলাইকুম! আমি আপনার দোকানের এআই অ্যাসিস্ট্যান্ট। আমি আপনার বকেয়া কাস্টমারদের অটো মেসেজ পাঠাতে এবং বিক্রির সাথে সাথে কাস্টমারকে নোটিফিকেশন পাঠাতে সাহায্য করব।' 
    }
  ]);

  // Auto-Sync Logic
  useEffect(() => {
    if (!isAutoSyncEnabled || !isLoggedIn || !user) return;
    
    // Debounce auto-sync to every 5 minutes or after significant changes
    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastAutoSyncTime > 5 * 60 * 1000) { // 5 minutes interval
        console.log("Triggering auto-sync...");
        // This is a placeholder for background sync
        // In this architecture, sync is primarily handled in CloudBackup component
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [contacts, salePurchaseRecords, stockItems, isLoggedIn, isAutoSyncEnabled, user, lastAutoSyncTime]);

  const [lastReminderDate, setLastReminderDate] = useState<string>(() => {
    return localStorage.getItem('dokan_last_reminder_date') || '';
  });

  const sendWhatsAppMessage = (phone: string, message: string) => {
    if (!phone) return;
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) {
      formattedPhone = '88' + formattedPhone;
    } else if (formattedPhone.length === 10) {
      formattedPhone = '880' + formattedPhone;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    safeSaveToLocalStorage('dokan_last_reminder_date', lastReminderDate);
  }, [lastReminderDate]);

  useEffect(() => {
    const checkWeeklyReminders = () => {
      const today = new Date();
      
      // Find customers who haven't been reminded in 7+ days
      const pendingAutoReminders = contacts.filter(c => {
        if (c.type !== ContactType.CUSTOMER || c.balance <= 0) return false;
        if (!c.lastReminderDate) return true; // Never reminded
        const lastDate = new Date(c.lastReminderDate);
        return (today.getTime() - lastDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
      });

      if (pendingAutoReminders.length > 0) {
        const reminderMsg = `আপনার ${pendingAutoReminders.length} জন কাস্টমারের এক সপ্তাহ বা তার বেশি সময় ধরে বকেয়া আছে। আমি কি তাদের জন্য নতুন এবং মজার রিমাইন্ডার মেসেজ তৈরি করে পাঠাব?`;
        setAiMessages(prev => {
          if (prev[prev.length - 1]?.text === reminderMsg) return prev;
          return [...prev, { role: 'ai', text: reminderMsg }];
        });
      }
    };

    if (contacts.length > 0) {
      checkWeeklyReminders();
    }
  }, [contacts]);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);

  const handleRestoreData = (restoredData: any, silent = false) => {
    if (!silent) setIsSyncing(true);
    const update = () => {
      if (restoredData.contacts) setContacts(restoredData.contacts);
      if (restoredData.salePurchaseRecords) setSalePurchaseRecords(restoredData.salePurchaseRecords);
      if (restoredData.stockItems) setStockItems(restoredData.stockItems);
      if (restoredData.stockTransactions) setStockTransactions(restoredData.stockTransactions);
      if (restoredData.shopSettings) setShopSettings(restoredData.shopSettings);
      if (!silent) {
        setIsSyncing(false);
        setCurrentView('TALLY');
      }
    };

    if (silent) {
      update();
    } else {
      setTimeout(update, 2000);
    }
  };

  useEffect(() => {
    const attemptAutoRestore = async () => {
      if (isLoggedIn && user && googleAccessToken && !autoRestoreAttempted.current) {
        autoRestoreAttempted.current = true;
        setIsRefreshing(true);
        try {
          const file = await findDriveBackup(googleAccessToken);
          if (file) {
            const cloudData = await getDriveFileContent(googleAccessToken, file.id);
            if (cloudData) {
              handleRestoreData(cloudData, true);
              console.log("Auto-restored from Google Drive");
            }
          }
        } catch (e) {
          console.error("Auto-restore failed:", e);
        } finally {
          setIsRefreshing(false);
        }
      }
    };
    attemptAutoRestore();
  }, [isLoggedIn, user, googleAccessToken]);

  const handleManualRefresh = async () => {
    if (!isLoggedIn || !user || !googleAccessToken) {
      setCurrentView('CLOUD_BACKUP');
      return;
    }
    
    setIsRefreshing(true);
    try {
      const file = await findDriveBackup(googleAccessToken);
      if (file) {
        const cloudData = await getDriveFileContent(googleAccessToken, file.id);
        if (cloudData) {
          handleRestoreData(cloudData, false);
          alert('সব তথ্য ও ছবি সফলভাবে রিফ্রেশ করা হয়েছে!');
        }
      } else {
        alert('কোথাও কোনো ব্যাকআপ খুঁজে পাওয়া যায়নি।');
      }
    } catch (e: any) {
      if (e.message === 'TOKEN_EXPIRED') {
        alert('আপনার সেশন শেষ হয়ে গেছে। দয়া করে আবার লগইন করুন।');
        handleLogout();
      } else {
        alert('রিফ্রেশ ব্যর্থ হয়েছে। ইন্টারনেট কানেকশন চেক করুন।');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const addContact = (updatedContact: Contact) => {
    const exists = contacts.find(c => c.id === updatedContact.id);
    if (exists) {
      setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
    } else {
      setContacts(prev => [...prev, updatedContact]);
    }
    setEditingContact(undefined);
    setCurrentView('TALLY');
  };

  const deleteContact = (id: string) => {
    const contactToDelete = contacts.find(c => c.id === id);
    if (contactToDelete?.photo?.startsWith('drive://') && googleAccessToken) {
      deleteFileFromDrive(googleAccessToken, contactToDelete.photo.replace('drive://', ''));
    }
    setContacts(prev => prev.filter(c => c.id !== id));
    setSelectedContactId(null);
    setCurrentView('TALLY');
  };

  const addSalePurchaseRecord = (record: SalePurchaseRecord) => {
    setSalePurchaseRecords(prev => [...prev, record]);
  };

  const updateContactTransactions = (contactId: string, transaction: Transaction) => {
    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
        const newBalance = transaction.type === 'DUE_GIVEN' 
          ? c.balance + transaction.amount 
          : c.balance - transaction.amount;
        return {
          ...c,
          balance: newBalance,
          lastActivity: 'এখনই',
          transactions: [transaction, ...c.transactions]
        };
      }
      return c;
    }));
  };

  const handleUpdateStock = (updatedItems: StockItem[], updatedTransactions: StockTransaction[]) => {
    if (googleAccessToken) {
      const deletedItems = stockItems.filter(oldItem => !updatedItems.find(newItem => newItem.id === oldItem.id));
      deletedItems.forEach(item => {
        if (item.image?.startsWith('drive://')) {
          deleteFileFromDrive(googleAccessToken, item.image.replace('drive://', ''));
        }
      });
    }
    setStockItems(updatedItems);
    setStockTransactions(updatedTransactions);
  };

  const handleUpdateContacts = (updatedContacts: Contact[]) => {
    setContacts(updatedContacts);
  };

  const handleConfirmSale = (saleData: { 
    contactId: string; 
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: { 
      productId: string; 
      name: string; 
      quantity: number; 
      price: number; 
      selectedSerials?: string[];
      discount?: number;
    }[]; 
    total: number; 
    paidAmount: number;
    dueAmount: number;
    isCash: boolean;
    discount?: number;
    discountType?: 'FIXED' | 'PERCENT';
  }): SalePurchaseRecord => {
    const date = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    const dueAmount = saleData.total - saleData.paidAmount;
    
    const updatedStock = stockItems.map(p => {
      const soldItem = saleData.items.find(si => si.productId === p.id);
      if (soldItem) {
        let updatedP = { ...p, quantity: p.quantity - soldItem.quantity };
        
        // Update serials if any were selected
        if (soldItem.selectedSerials && soldItem.selectedSerials.length > 0) {
          if (updatedP.serialNumber && soldItem.selectedSerials.includes(updatedP.serialNumber)) {
            updatedP.serialNumber = '';
          }
          if (updatedP.serialNumbers) {
            updatedP.serialNumbers = updatedP.serialNumbers.filter(sn => !soldItem.selectedSerials?.includes(sn));
          }
        }
        
        return updatedP;
      }
      return p;
    });
    setStockItems(updatedStock);

    const record: SalePurchaseRecord = {
      id: Date.now().toString(),
      type: 'SALE',
      amount: saleData.total,
      paidAmount: saleData.paidAmount,
      dueAmount: dueAmount,
      description: saleData.items.map(i => `${i.name} (${i.quantity})`).join(', '),
      date,
      isCash: saleData.isCash,
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      customerAddress: saleData.customerAddress,
      items: saleData.items,
      discount: saleData.discount,
      discountType: saleData.discountType
    };
    setSalePurchaseRecords(prev => [...prev, record]);

    // Send WhatsApp Notification for Sale
    if (saleData.customerPhone) {
      const generateSaleMsg = async () => {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a professional and polite shopkeeper in Bangladesh. 
            A sale has just been completed for a customer named ${saleData.customerName}.
            Details: Total=৳${saleData.total}, Paid=৳${saleData.paidAmount}, Due=৳${dueAmount}, Invoice No=${record.id}.
            Generate a beautiful, professional, and polite WhatsApp thank you message in Bengali. 
            Include the sale details naturally in the message.
            Return ONLY the message text.`,
          });
          sendWhatsAppMessage(saleData.customerPhone || '', response.text);
        } catch (e) {
          const fallbackMsg = `আসসালামু আলাইকুম, ${saleData.customerName}—আপনার কেনাকাটা সফল হয়েছে। মোট: ৳${saleData.total}, পরিশোধ: ৳${saleData.paidAmount}, বাকি: ৳${dueAmount}। ক্যাশ মেমো নং: ${record.id}। ধন্যবাদ।`;
          sendWhatsAppMessage(saleData.customerPhone || '', fallbackMsg);
        }
      };
      generateSaleMsg();
    }

    // Record stock transactions for each item sold
    const newStockTransactions: StockTransaction[] = saleData.items.map(item => ({
      id: (Date.now() + Math.random()).toString(),
      itemId: item.productId,
      itemName: item.name,
      type: 'OUT',
      quantity: item.quantity,
      price: item.price,
      date,
      partyName: saleData.customerName || 'নগদ কাস্টমার'
    }));
    setStockTransactions(prev => [...newStockTransactions, ...prev]);

    // Update Contact Balance if not a generic cash customer or if there's a due/overpayment
    if (saleData.contactId !== 'CASH_CUSTOMER' && saleData.contactId !== '') {
      // If there's any difference between total and paid, record it
      if (dueAmount !== 0) {
        const transaction: Transaction = {
          id: (Date.now() + 1).toString(),
          type: dueAmount > 0 ? 'DUE_GIVEN' : 'RECEIVED',
          amount: Math.abs(dueAmount),
          description: `বিক্রি: ${record.description} (মোট: ৳${saleData.total}, জমা: ৳${saleData.paidAmount})`,
          date,
          recordId: record.id
        };
        updateContactTransactions(saleData.contactId, transaction);
      }
    } else if (dueAmount !== 0) {
       // Create new contact for non-cash sales or partial payments
       const newContactId = Date.now().toString();
       const newContact: Contact = {
          id: newContactId,
          name: saleData.customerName,
          phone: saleData.customerPhone,
          address: saleData.customerAddress,
          type: ContactType.CUSTOMER,
          balance: dueAmount,
          lastActivity: 'এখনই',
          transactions: [{
            id: (Date.now() + 2).toString(),
            type: dueAmount > 0 ? 'DUE_GIVEN' : 'RECEIVED',
            amount: Math.abs(dueAmount),
            description: `বিক্রি: ${record.description} (মোট: ৳${saleData.total}, জমা: ৳${saleData.paidAmount})`,
            date,
            recordId: record.id
          }]
       };
       setContacts(prev => [...prev, newContact]);
    }

    return record;
  };

  const handleDeleteReturn = (id: string) => {
    const record = salePurchaseRecords.find(r => r.id === id);
    if (!record) return;

    // 1. Reverse Stock Changes
    const updatedStock = stockItems.map(p => {
      const itemInRecord = record.items?.find(ri => ri.productId === p.id);
      if (itemInRecord) {
        const qtyChange = record.type === 'RETURN_CUSTOMER' ? -itemInRecord.quantity : itemInRecord.quantity;
        return { ...p, quantity: p.quantity + qtyChange };
      }
      return p;
    });
    setStockItems(updatedStock);

    // 2. Remove Stock Transactions (Best effort matching by date and name)
    setStockTransactions(prev => prev.filter(st => !(st.date === record.date && record.description.includes(st.itemName))));

    // 3. Reverse Contact Balance and remove transaction
    setContacts(prev => prev.map(c => {
      const transaction = c.transactions.find(t => t.recordId === id);
      if (transaction) {
        const newBalance = transaction.type === 'DUE_GIVEN' 
          ? c.balance - transaction.amount 
          : c.balance + transaction.amount;
        return {
          ...c,
          balance: newBalance,
          transactions: c.transactions.filter(t => t.recordId !== id)
        };
      }
      return c;
    }));

    // 4. Remove the record
    const recordToDelete = salePurchaseRecords.find(r => r.id === id);
    if (recordToDelete?.invoiceImage?.startsWith('drive://') && googleAccessToken) {
      deleteFileFromDrive(googleAccessToken, recordToDelete.invoiceImage.replace('drive://', ''));
    }
    setSalePurchaseRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleConfirmReturn = (returnData: {
    type: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';
    contactId: string;
    contactName: string;
    items: { productId: string; name: string; quantity: number; price: number }[];
    total: number;
    addToStock: boolean;
    originalId?: string;
  }) => {
    if (returnData.originalId) {
      handleDeleteReturn(returnData.originalId);
    }
    const date = new Date().toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' });
    
    if (returnData.addToStock) {
      const updatedStock = stockItems.map(p => {
        const returnedItem = returnData.items.find(ri => ri.productId === p.id);
        if (returnedItem) {
          const qtyChange = returnData.type === 'RETURN_CUSTOMER' ? returnedItem.quantity : -returnedItem.quantity;
          return { ...p, quantity: p.quantity + qtyChange };
        }
        return p;
      });
      setStockItems(updatedStock);

      const newStockTransactions: StockTransaction[] = returnData.items.map(item => ({
        id: (Date.now() + Math.random()).toString(),
        itemId: item.productId,
        itemName: item.name,
        type: returnData.type === 'RETURN_CUSTOMER' ? 'RETURN_IN' : 'RETURN_OUT',
        quantity: item.quantity,
        price: item.price,
        date,
        partyName: returnData.contactName
      }));
      setStockTransactions(prev => [...newStockTransactions, ...prev]);
    }

    const record: SalePurchaseRecord = {
      id: Date.now().toString(),
      type: returnData.type,
      amount: returnData.total,
      description: `রিটার্ন: ${returnData.items.map(i => `${i.name} (${i.quantity})`).join(', ')}`,
      date,
      isCash: false,
      customerName: returnData.type === 'RETURN_CUSTOMER' ? returnData.contactName : undefined,
      items: returnData.items
    };
    setSalePurchaseRecords(prev => [...prev, record]);

    if (returnData.contactId) {
      const transaction: Transaction = {
        id: (Date.now() + 1).toString(),
        type: returnData.type === 'RETURN_CUSTOMER' ? 'RECEIVED' : 'DUE_GIVEN',
        amount: returnData.total,
        description: `রিটার্ন: ${record.description}`,
        date,
        recordId: record.id
      };
      updateContactTransactions(returnData.contactId, transaction);
    }
  };

  const handleSendReminders = async (targetContacts?: Contact[]) => {
    const dueCustomers = targetContacts || contacts.filter(c => c.type === ContactType.CUSTOMER && c.balance > 0);
    if (dueCustomers.length === 0) return;

    const useManual = shopSettings.reminderTemplates && shopSettings.reminderTemplates.length > 0;

    if (useManual) {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'আপনার সেট করা ম্যানুয়াল মেসেজগুলো পাঠানোর প্রক্রিয়া শুরু করছি...' }]);
    } else {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'আমি এআই-এর মাধ্যমে সাবলীল, আকর্ষণীয় এবং মজার মেসেজ তৈরি করছি। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন...' }]);
    }

    try {
      let aiMessagesList: string[] = [];
      
      if (useManual) {
        aiMessagesList = dueCustomers.map(c => {
          const index = (c.reminderCount || 0) % shopSettings.reminderTemplates!.length;
          const template = shopSettings.reminderTemplates![index];
          
          // Replace placeholders if they exist
          let processed = template
            .replace(/{নাম}|{name}/g, c.name)
            .replace(/{বকেয়া}|{balance}/g, c.balance.toLocaleString('bn-BD'));
            
          // If no placeholders were used, automatically prepend name and balance as requested
          if (processed === template) {
             processed = `${c.name} ভাই, আপনার মোট বকেয়া ৳${c.balance.toLocaleString('bn-BD')}। ${template}`;
          }
          return processed;
        });
      } else {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey || '' });
        incrementGeminiUsage();
        const customerData = dueCustomers.map(c => `${c.name}: ৳${c.balance} (রিমাইন্ডার সংখ্যা: ${(c.reminderCount || 0) + 1})`).join('\n');
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are a professional yet very friendly and humorous shopkeeper in Bangladesh. 
          Generate a unique, attractive, and funny WhatsApp reminder message for each of the following customers based on their due amount and how many times they have been reminded.
          
          Current Time Seed: ${Date.now()}
          
          Requirements:
          1. Language: Bengali (Standard/Colloquial mix that feels natural).
          2. Tone: Respectful but very engaging. Use humor or a lighthearted joke related to money, memory, or friendship to make the customer smile.
          3. Content: Must explicitly mention the due amount (৳).
          4. Variety: Since this might be the 2nd or 3rd time, make sure the message is different from a standard first-time reminder. If it's the 1st time, be gentle. If it's the 3rd+, be a bit more "playfully persistent".
          5. Goal: The customer should feel good reading it, not pressured, but still remember to pay.
          
          Return the result as a JSON array of strings, where each string is the message for the corresponding customer in the order provided.
          Return ONLY the JSON array.
          
          Customers:
          ${customerData}`,
        });

        try {
          const text = (response.text || '').replace(/```json|```/g, '').trim();
          aiMessagesList = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse AI response:", e);
          aiMessagesList = dueCustomers.map((c, idx) => {
            const fallbacks = [
              `আসসালামু আলাইকুম, ${c.name}—আপনার কাছে ৳${c.balance} বকেয়া আছে। টাকাটা দিলে এক কাপ চা খাওয়াবো ইনশাআল্লাহ!`,
              `প্রিয় ${c.name}, আপনার ৳${c.balance} বকেয়াটা কি মনে আছে? সময় করে দিয়ে দিলে খুব উপকার হতো। ধন্যবাদ!`,
              `আসসালামু আলাইকুম, ${c.name}। আপনার ৳${c.balance} বকেয়াটা পরিশোধের জন্য অনুরোধ করছি। ভালো থাকবেন।`,
              `ভাই ${c.name}, ৳${c.balance} বকেয়াটা কি আজ দেওয়া সম্ভব? দোকানের স্টক তুলতে হবে। ধন্যবাদ!`
            ];
            return fallbacks[((c.reminderCount || 0) + idx) % fallbacks.length];
          });
        }
      }

      // Update contact reminder metadata
      const today = new Date().toISOString();
      setContacts(prev => prev.map(c => {
        const isTarget = dueCustomers.find(dc => dc.id === c.id);
        if (isTarget) {
          return {
            ...c,
            lastReminderDate: today,
            reminderCount: (c.reminderCount || 0) + 1
          };
        }
        return c;
      }));

      // Send the messages
      dueCustomers.forEach((c, index) => {
        setTimeout(() => {
          const msg = aiMessagesList[index] || `আসসালামু আলাইকুম, ${c.name}—আপনার কাছে ৳${c.balance} বকেয়া আছে। সময় হলে পরিশোধ করবেন। ধন্যবাদ।`;
          sendWhatsAppMessage(c.phone, msg);
        }, index * 3000); 
      });

      setAiMessages(prev => [...prev, { role: 'ai', text: 'আমি সব বকেয়া কাস্টমারদের জন্য আকর্ষণীয় মেসেজ তৈরি করে পাঠানোর প্রক্রিয়া শুরু করছি। ব্রাউজারে পপ-আপ এলাউ করা থাকলে মেসেজগুলো অটোমেটিক ওপেন হবে।' }]);
    } catch (error) {
      console.error("AI Message Generation failed:", error);
      dueCustomers.forEach((c, index) => {
        setTimeout(() => {
          const msg = `আসসালামু আলাইকুম, ${c.name}—আপনার কাছে ৳${c.balance} বকেয়া আছে। সময় হলে পরিশোধ করবেন। ধন্যবাদ।`;
          sendWhatsAppMessage(c.phone, msg);
        }, index * 2000);
      });
      setAiMessages(prev => [...prev, { role: 'ai', text: 'দুঃখিত, এআই মেসেজ তৈরিতে সমস্যা হয়েছে। আমি ডিফল্ট মেসেজ পাঠানোর প্রক্রিয়া শুরু করছি।' }]);
    }
  };

  const handleSendInvitations = async (targetContacts?: Contact[]) => {
    const zeroBalanceCustomers = targetContacts || contacts.filter(c => c.type === ContactType.CUSTOMER && c.balance <= 0);
    if (zeroBalanceCustomers.length === 0) return;

    const useManual = shopSettings.invitationTemplates && shopSettings.invitationTemplates.length > 0;

    if (useManual) {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'আপনার সেট করা ম্যানুয়াল আমন্ত্রণ মেসেজগুলো পাঠানোর প্রক্রিয়া শুরু করছি...' }]);
    } else {
      setAiMessages(prev => [...prev, { role: 'ai', text: 'আমি আমন্ত্রণ মেসেজ পাঠানোর প্রক্রিয়া শুরু করছি...' }]);
    }

    try {
      let messagesList: string[] = [];
      
      if (useManual) {
        messagesList = zeroBalanceCustomers.map(c => {
          const index = (c.invitationCount || 0) % shopSettings.invitationTemplates!.length;
          const template = shopSettings.invitationTemplates![index];
          
          // Replace placeholders if they exist
          let processed = template.replace(/{নাম}|{name}/g, c.name);
          
          // If no placeholders were used, automatically prepend name as requested
          if (processed === template) {
             processed = `${c.name} ভাই, ${template}`;
          }
          return processed;
        });
      } else {
        messagesList = zeroBalanceCustomers.map(c => {
          const fallbacks = [
            `আসসালামু আলাইকুম, ${c.name}। কেমন আছেন? অনেকদিন আপনার দেখা নেই। সময় পেলে আমাদের দোকানে একবার আসবেন।`,
            `প্রিয় ${c.name}, আমাদের দোকানে নতুন কিছু কালেকশন এসেছে। আপনার আমন্ত্রন রইলো।`,
            `আসসালামু আলাইকুম ${c.name} ভাই। আপনার সাথে আড্ডা দেওয়া মিস করছি। দোকানে আসবেন কিন্তু!`,
            `শুভেচ্ছা জানবেন ${c.name}। আমাদের দোকানে আসার জন্য আপনাকে সাদর আমন্ত্রণ জানাচ্ছি।`
          ];
          return fallbacks[(c.invitationCount || 0) % fallbacks.length];
        });
      }

      // Update contact invitation metadata
      setContacts(prev => prev.map(c => {
        const isTarget = zeroBalanceCustomers.find(zbc => zbc.id === c.id);
        if (isTarget) {
          return {
            ...c,
            invitationCount: (c.invitationCount || 0) + 1
          };
        }
        return c;
      }));

      // Send the messages
      zeroBalanceCustomers.forEach((c, index) => {
        setTimeout(() => {
          const msg = messagesList[index] || `আসসালামু আলাইকুম, ${c.name}। আমাদের দোকানে আসার জন্য আপনাকে আমন্ত্রণ জানাচ্ছি। ভালো থাকবেন।`;
          sendWhatsAppMessage(c.phone, msg);
        }, index * 3000); 
      });

      setAiMessages(prev => [...prev, { role: 'ai', text: 'আমি সব কাস্টমারদের জন্য আমন্ত্রণ মেসেজ পাঠানোর প্রক্রিয়া শুরু করছি।' }]);
    } catch (error) {
      console.error("Invitation sending failed:", error);
      setAiMessages(prev => [...prev, { role: 'ai', text: 'দুঃখিত, আমন্ত্রণ মেসেজ পাঠাতে সমস্যা হয়েছে।' }]);
    }
  };

  const selectedContact = useMemo(() => 
    contacts.find(c => c.id === selectedContactId), 
    [contacts, selectedContactId]
  );

  const handleHelpClick = () => {
    window.open(HELP_WHATSAPP_URL, '_blank');
  };

  const handleLoginSuccess = (profile: UserProfile, token?: string | null) => {
    setIsLoggedIn(true);
    setUser(profile);
    if (token) {
      setGoogleAccessToken(token);
      localStorage.setItem('google_access_token', token);
    }
  };

  const handleLogout = async () => {
    try {
      if (isFirebaseConfigured && auth) {
        await signOut(auth);
      }
      setIsLoggedIn(false);
      setUser(null);
      setGoogleAccessToken(null);
      localStorage.removeItem('google_access_token');
      setShopSettings(defaultShopSettings); 
      setCurrentView('TALLY');
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavigation = (view: ViewState) => {
    if (view === 'MENU') {
      setIsSidebarOpen(true);
    } else {
      setCurrentView(view);
    }
  };

  const renderView = () => {
    if (isInitializing) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white">
          <div className="w-12 h-12 border-4 border-[#D32F2F] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold animate-pulse">লোড হচ্ছে...</p>
        </div>
      );
    }

    if (isSyncing) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
          <div className="relative">
             <div className="w-20 h-20 border-4 border-red-50 border-t-red-600 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <img src="https://www.google.com/favicon.ico" alt="g" className="w-6 h-6 animate-pulse" />
             </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 leading-tight">ক্লাউড থেকে ডাটা লোড হচ্ছে...</h3>
            <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">দয়া করে অপেক্ষা করুন</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'TALLY':
        return <TallyView contacts={contacts} saleRecords={salePurchaseRecords} onSelectContact={id => { setSelectedContactId(id); setCurrentView('CONTACT_DETAILS'); }} onAddContact={() => { setEditingContact(undefined); setCurrentView('ADD_CONTACT'); }} onNavigate={handleNavigation} geminiUsageCount={geminiUsageCount} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'CUSTOMERS':
        return <TallyView contacts={contacts} saleRecords={salePurchaseRecords} onSelectContact={id => { setSelectedContactId(id); setCurrentView('CONTACT_DETAILS'); }} onAddContact={() => { setEditingContact(undefined); setCurrentView('ADD_CONTACT'); }} onNavigate={handleNavigation} typeFilter={ContactType.CUSTOMER} geminiUsageCount={geminiUsageCount} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'SUPPLIERS':
        return <TallyView contacts={contacts} saleRecords={salePurchaseRecords} onSelectContact={id => { setSelectedContactId(id); setCurrentView('CONTACT_DETAILS'); }} onAddContact={() => { setEditingContact(undefined); setCurrentView('ADD_CONTACT'); }} onNavigate={handleNavigation} typeFilter={ContactType.SUPPLIER} geminiUsageCount={geminiUsageCount} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'CASHBOX': return <CashboxView />;
      case 'ADD_CONTACT': return <AddContactForm onBack={() => setCurrentView(editingContact ? 'CONTACT_DETAILS' : 'TALLY')} onSave={addContact} editContact={editingContact} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'CONTACT_DETAILS': return selectedContact ? <ContactDetails contact={selectedContact} records={salePurchaseRecords} stockTransactions={stockTransactions} contacts={contacts} onBack={() => setCurrentView('TALLY')} onAddTransaction={t => updateContactTransactions(selectedContact.id, t)} onDeleteContact={deleteContact} onEditContact={c => { setEditingContact(c); setCurrentView('ADD_CONTACT'); }} onUpdateContacts={handleUpdateContacts} shopSettings={shopSettings} onIncrementGeminiUsage={incrementGeminiUsage} geminiUsageCount={geminiUsageCount} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} /> : null;
      case 'BECHA_KENA': return <BechaKenaView records={salePurchaseRecords} stockTransactions={stockTransactions} stockItems={stockItems} contacts={contacts} onBack={() => setCurrentView('TALLY')} onAddRecord={addSalePurchaseRecord} onUpdateContacts={handleUpdateContacts} shopSettings={shopSettings} onSelectContact={id => { setSelectedContactId(id); setCurrentView('CONTACT_DETAILS'); }} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'CLOUD_BACKUP': return <CloudBackup data={{ contacts, salePurchaseRecords, stockItems, shopSettings, stockTransactions }} onBack={() => setCurrentView('TALLY')} onLoginSuccess={handleLoginSuccess} onLogout={handleLogout} onRestore={handleRestoreData} currentLoggedInState={isLoggedIn} currentUserProfile={user} shopSettings={shopSettings} onUpdateShopSettings={setShopSettings} isAutoSyncEnabled={isAutoSyncEnabled} onToggleAutoSync={toggleAutoSync} googleAccessToken={googleAccessToken} onUpdateGoogleToken={setGoogleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'AI_CHAT': return <AIChatView contacts={contacts} records={salePurchaseRecords} onBack={() => setCurrentView('TALLY')} persistedMessages={aiMessages} onMessagesUpdate={setAiMessages} onClearChat={() => setAiMessages([])} onSendReminders={handleSendReminders} onSendInvitations={handleSendInvitations} onIncrementGeminiUsage={incrementGeminiUsage} />;
      case 'STOCK': return <StockView items={stockItems} transactions={stockTransactions} contacts={contacts} onBack={() => setCurrentView('TALLY')} onUpdateStock={handleUpdateStock} onUpdateContacts={handleUpdateContacts} onAddRecord={addSalePurchaseRecord} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'SALE_ENTRY': return <SaleEntryView contacts={contacts} stockItems={stockItems} onBack={() => setCurrentView('TALLY')} onConfirmSale={handleConfirmSale} shopSettings={shopSettings} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />;
      case 'PRODUCT_RETURN': return <ProductReturnView contacts={contacts} stockItems={stockItems} records={salePurchaseRecords} onBack={() => setCurrentView('TALLY')} onConfirmReturn={handleConfirmReturn} onDeleteReturn={handleDeleteReturn} onIncrementGeminiUsage={incrementGeminiUsage} />;
      case 'HELP_SUPPORT': return <HelpSupportView onBack={() => setCurrentView('TALLY')} />;
      default: return <TallyView contacts={contacts} saleRecords={salePurchaseRecords} onSelectContact={() => {}} onAddContact={() => {}} onNavigate={handleNavigation} />;
    }
  };

  const displayShopName = isLoggedIn && shopSettings.shopName !== 'গেস্ট' ? shopSettings.shopName : 'গেস্ট';
  const headerPhoto = isLoggedIn ? (shopSettings.shopLogo || (user ? user.photo : null)) : null;

  const hasDriveImages = useMemo(() => {
    return contacts.some(c => c.photo?.startsWith('drive://')) || 
           stockItems.some(item => item.image?.startsWith('drive://')) ||
           salePurchaseRecords.some(r => r.invoiceImage?.startsWith('drive://')) ||
           shopSettings.shopLogo?.startsWith('drive://');
  }, [contacts, stockItems, salePurchaseRecords, shopSettings.shopLogo]);

  const handleTokenExpired = () => {
    setGoogleAccessToken(null);
    localStorage.removeItem('google_access_token');
    console.warn('Google Access Token expired and cleared from state');
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col relative shadow-xl">
      <header className="bg-[#D32F2F] text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        {isLoggedIn && !googleAccessToken && hasDriveImages && (
          <div 
            onClick={() => setCurrentView('CLOUD_BACKUP')}
            className="bg-yellow-400 text-black px-4 py-2 text-[10px] font-black text-center animate-in slide-in-from-top flex items-center justify-center gap-2 cursor-pointer mb-2 rounded-lg shadow-inner"
          >
            <CloudUpload size={14} className="animate-bounce" />
            ছবিগুলো দেখতে গুগল ড্রাইভ কানেক্ট করুন (ক্লিক করুন)
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity" onClick={() => setIsSidebarOpen(true)}>
            <div className="bg-white/20 p-1 rounded-md flex items-center gap-2">
              {headerPhoto ? <DriveImage src={headerPhoto} className="w-5 h-5 rounded-full border border-white/40 object-cover" alt="p" token={googleAccessToken} onTokenExpired={handleTokenExpired} /> : <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold"><Store size={12} /></div>}
              <span className="text-sm font-bold truncate max-w-[120px]">{displayShopName}</span>
            </div>
            <ChevronDown size={16} />
          </div>
          <div className="flex items-center gap-4">
            <div 
              onClick={handleManualRefresh} 
              className={`flex flex-col items-center cursor-pointer transition-all ${isRefreshing ? 'opacity-50 pointer-events-none' : 'active:scale-90'}`}
            >
              <RefreshCw size={24} className={`${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] mt-1 text-white font-bold">রিফ্রেশ</span>
            </div>
            <div onClick={() => setCurrentView('AI_CHAT')} className="flex flex-col items-center cursor-pointer"><Sparkles size={24} className="text-yellow-300" /><span className="text-[10px] mt-1 text-white font-bold">এআই</span></div>
            <div className="relative flex flex-col items-center cursor-pointer"><Bell size={24} /><span className="text-[10px] mt-1 text-white font-bold">ইনবক্স</span></div>
            <div onClick={handleHelpClick} className="flex flex-col items-center cursor-pointer"><HelpCircle size={24} /><span className="text-[10px] mt-1 text-white font-bold">হেল্প</span></div>
          </div>
        </div>
      </header>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isLoggedIn={isLoggedIn} user={user} shopSettings={shopSettings} onNavigate={view => { setCurrentView(view); setIsSidebarOpen(false); }} onLogout={handleLogout} googleAccessToken={googleAccessToken} onTokenExpired={handleTokenExpired} />
      <main className="flex-1 overflow-y-auto pb-20 bg-gray-50">{renderView()}</main>
      {['TALLY', 'CASHBOX', 'STOCK', 'CUSTOMERS', 'SUPPLIERS', 'SALE_ENTRY'].includes(currentView) ? (
        <Navigation currentView={currentView} onNavigate={handleNavigation} />
      ) : null}
    </div>
  );
};

export default App;
