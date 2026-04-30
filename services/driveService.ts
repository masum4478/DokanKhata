
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const FOLDER_NAME = 'DokanKhata_Backup';

export const findDriveBackup = async (token: string) => {
  try {
    // 1. Find folder
    const folderQuery = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const folderResponse = await fetch(`${DRIVE_API_URL}?q=${folderQuery}&spaces=drive&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const folderResult = await folderResponse.json();
    const folderId = folderResult.files?.[0]?.id;
    
    if (!folderId) return null;

    // 2. Find file
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

export const getDriveFileContent = async (token: string, fileId: string) => {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (response.ok) {
    return await response.json();
  }
  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }
  throw new Error('FAILED_TO_FETCH_FILE');
};
