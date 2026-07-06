
export const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
export const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';
export const FOLDER_NAME = 'DokanKhata_Backup';
export const IMAGES_FOLDER_NAME = 'Images';

export const getOrCreateFolder = async (token: string, folderName: string, parentId?: string) => {
  try {
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentId ? ` and '${parentId}' in parents` : ''}`);
    const response = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Drive Search Error (${response.status}):`, errorText);
      if (response.status === 401) throw new Error('TOKEN_EXPIRED');
      return null;
    }

    const result = await response.json();
    
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }

    console.log(`Folder '${folderName}' not found, creating...`);
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
      const errorText = await createResponse.text();
      console.error(`Google Drive Create Error (${createResponse.status}):`, errorText);
      return null;
    }
    const createResult = await createResponse.json();
    return createResult.id;
  } catch (e: any) {
    if (e.message === 'TOKEN_EXPIRED') throw e;
    return null;
  }
};

export const uploadFileToDrive = async (token: string, name: string, mimeType: string, content: any, folderId: string, existingFileId?: string) => {
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
      if (response.status === 401) throw new Error('TOKEN_EXPIRED');
      return null;
    }
    const result = await response.json();
    return result.id;
  } catch (e: any) {
    if (e.message === 'TOKEN_EXPIRED') throw e;
    return null;
  }
};

export const ensureImagesFolder = async (token: string) => {
  const mainFolderId = await getOrCreateFolder(token, FOLDER_NAME);
  if (!mainFolderId) return null;
  return await getOrCreateFolder(token, IMAGES_FOLDER_NAME, mainFolderId);
};

export const findDriveBackup = async (token: string, fileName: string) => {
  try {
    const mainFolderId = await getOrCreateFolder(token, FOLDER_NAME);
    if (!mainFolderId) return null;

    const query = encodeURIComponent(`name = '${fileName}' and '${mainFolderId}' in parents and trashed = false`);
    const response = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id, name, modifiedTime)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('TOKEN_EXPIRED');
      return null;
    }

    const result = await response.json();
    if (result.files && result.files.length > 0) {
      // Return the most recent one if multiple exist
      return result.files.sort((a: any, b: any) => 
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      )[0];
    }
    return null;
  } catch (e: any) {
    if (e.message === 'TOKEN_EXPIRED') throw e;
    return null;
  }
};

export const getDriveFileContent = async (token: string, fileId: string) => {
  try {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('TOKEN_EXPIRED');
      return null;
    }

    return await response.json();
  } catch (e: any) {
    if (e.message === 'TOKEN_EXPIRED') throw e;
    return null;
  }
};

export const syncDataToDrive = async (token: string, data: any, onProgress?: (msg: string) => void) => {
  try {
    // 1. Ensure Folders
    onProgress?.('ফোল্ডার চেক করা হচ্ছে...');
    const folderId = await getOrCreateFolder(token, FOLDER_NAME);
    if (!folderId) throw new Error('FOLDER_FAILED');

    const imagesFolderId = await getOrCreateFolder(token, IMAGES_FOLDER_NAME, folderId);
    if (!imagesFolderId) throw new Error('IMAGES_FOLDER_FAILED');

    // 2. Sync Images (Stock Items)
    const updatedStockItems = [];
    for (const item of data.stockItems) {
      if (item.image && item.image.startsWith('data:image')) {
        onProgress?.(`পণ্য আপলোড: ${item.name || item.id}`);
        const fileName = `product_${item.id}.jpg`;
        const fileId = await uploadFileToDrive(token, fileName, 'image/jpeg', item.image, imagesFolderId);
        updatedStockItems.push({ ...item, image: fileId ? `drive://${fileId}` : item.image });
      } else {
        updatedStockItems.push(item);
      }
    }

    // 3. Sync Images (Sale Purchase Records)
    const updatedRecords = [];
    for (const record of data.salePurchaseRecords) {
      if (record.invoiceImage && record.invoiceImage.startsWith('data:image')) {
        onProgress?.(`ইনভয়েস আপলোড: ${record.id}`);
        const fileName = `invoice_${record.id}.jpg`;
        const fileId = await uploadFileToDrive(token, fileName, 'image/jpeg', record.invoiceImage, imagesFolderId);
        updatedRecords.push({ ...record, invoiceImage: fileId ? `drive://${fileId}` : record.invoiceImage });
      } else {
        updatedRecords.push(record);
      }
    }

    // 4. Sync Images (Contacts)
    const updatedContacts = [];
    for (const contact of data.contacts) {
      if (contact.photo && contact.photo.startsWith('data:image')) {
        onProgress?.(`কন্টাক্ট ফটো: ${contact.name}`);
        const fileName = `contact_${contact.id}.jpg`;
        const fileId = await uploadFileToDrive(token, fileName, 'image/jpeg', contact.photo, imagesFolderId);
        updatedContacts.push({ ...contact, photo: fileId ? `drive://${fileId}` : contact.photo });
      } else {
        updatedContacts.push(contact);
      }
    }

    // 5. Sync Shop Logo
    let updatedShopSettings = { ...data.shopSettings };
    if (data.shopSettings.shopLogo && data.shopSettings.shopLogo.startsWith('data:image')) {
      onProgress?.('দোকান লোগো আপলোড হচ্ছে...');
      const fileName = `shop_logo_${Date.now()}.jpg`;
      const fileId = await uploadFileToDrive(token, fileName, 'image/jpeg', data.shopSettings.shopLogo, imagesFolderId);
      if (fileId) updatedShopSettings.shopLogo = `drive://${fileId}`;
    }

    // Sync Images (Warranties)
    const updatedWarranties = [];
    if (data.warranties) {
      for (const item of data.warranties) {
        if (item.productImage && item.productImage.startsWith('data:image')) {
          onProgress?.(`ওয়ারেন্টি পণ্য আপলোড: ${item.productName || item.id}`);
          const fileName = `warranty_${item.id}.jpg`;
          const fileId = await uploadFileToDrive(token, fileName, 'image/jpeg', item.productImage, imagesFolderId);
          updatedWarranties.push({ ...item, productImage: fileId ? `drive://${fileId}` : item.productImage });
        } else {
          updatedWarranties.push(item);
        }
      }
    }

    // 6. Final JSON Backup
    onProgress?.('ড্রাইভে সেভ করা হচ্ছে...');
    const finalData = {
      ...data,
      stockItems: updatedStockItems,
      salePurchaseRecords: updatedRecords,
      contacts: updatedContacts,
      shopSettings: updatedShopSettings,
      warranties: data.warranties ? updatedWarranties : undefined
    };

    const existingFile = await findDriveBackup(token, 'DokanKhata_Backup.json');
    const resultId = await uploadFileToDrive(token, 'DokanKhata_Backup.json', 'application/json', JSON.stringify(finalData), folderId, existingFile?.id);
    
    return { success: true, fileId: resultId, finalData };
  } catch (error: any) {
    console.error("syncDataToDrive failed:", error);
    throw error;
  }
};
