import { getAccessToken } from './firebaseAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

export interface DriveQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
}

export interface DriveUserInfo {
  displayName?: string;
  emailAddress?: string;
  photoLink?: string;
}

const FOLDER_NAME = 'OmniMath AI Projects';

/**
 * Ensures a valid access token is present
 */
async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Drive access token not available. Please sign in with Google.');
  }
  return token;
}

/**
 * Fetch Drive User and Quota details
 */
export async function getDriveAbout(): Promise<{ user?: DriveUserInfo; quota?: DriveQuota }> {
  const token = await requireToken();
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch Google Drive user information.');
  }

  const data = await res.json();
  return {
    user: data.user,
    quota: data.storageQuota,
  };
}

/**
 * Find or create the dedicated 'OmniMath AI Projects' folder in user's Drive root
 */
export async function getOrCreateOmniMathFolder(): Promise<string> {
  const token = await requireToken();

  // Search for existing folder
  const query = encodeURIComponent(
    `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder if it doesn't exist
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dedicated cloud folder for OmniMath AI calculations, 3D plots, and matrices',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create OmniMath folder in Google Drive.');
  }

  const folder = await createRes.json();
  return folder.id;
}

/**
 * List files in the OmniMath folder or general Drive
 */
export async function listDriveFiles(folderId?: string): Promise<DriveFileItem[]> {
  const token = await requireToken();

  let query = 'trashed = false';
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  } else {
    // List OmniMath files or root
    query += ` and (name contains 'omnimath' or mimeType = 'application/json' or mimeType = 'image/png')`;
  }

  const fields = 'files(id,name,mimeType,modifiedTime,size,webViewLink,thumbnailLink,iconLink)';
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&fields=${encodeURIComponent(fields)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to list files from Google Drive.');
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Save mathematical workspace (JSON) to Google Drive
 */
export async function saveWorkspaceToDrive(
  title: string,
  workspaceData: any
): Promise<DriveFileItem> {
  const token = await requireToken();
  const folderId = await getOrCreateOmniMathFolder().catch(() => undefined);

  const cleanTitle = title.trim().endsWith('.omnimath.json')
    ? title.trim()
    : `${title.trim() || 'Untitled Calculation'}.omnimath.json`;

  const metadata: any = {
    name: cleanTitle,
    mimeType: 'application/json',
    description: 'OmniMath AI mathematical workspace project',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const content = JSON.stringify(
    {
      ...workspaceData,
      savedAt: new Date().toISOString(),
      app: 'OmniMath AI Studio',
      version: '1.0.0',
    },
    null,
    2
  );

  const boundary = '-------OmniMathBoundary314159';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload workspace to Google Drive.');
  }

  return await res.json();
}

/**
 * Save 3D Surface PNG image to Google Drive
 */
export async function saveImageToDrive(
  filename: string,
  dataUrl: string
): Promise<DriveFileItem> {
  const token = await requireToken();
  const folderId = await getOrCreateOmniMathFolder().catch(() => undefined);

  const cleanName = filename.endsWith('.png') ? filename : `${filename}.png`;
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

  // Convert base64 to binary blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  const metadata: any = {
    name: cleanName,
    mimeType: 'image/png',
    description: 'OmniMath AI 3D Surface Graph Visualization Snapshot',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', blob);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload image to Google Drive.');
  }

  return await res.json();
}

/**
 * Read content of a saved workspace file
 */
export async function getDriveFileContent(fileId: string): Promise<any> {
  const token = await requireToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Failed to download project content from Google Drive.');
  }

  return await res.json();
}

/**
 * Delete a file from Google Drive (Requires explicit confirmation beforehand!)
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await requireToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete file from Google Drive.');
  }
}
