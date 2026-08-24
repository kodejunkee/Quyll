import { invoke } from '@tauri-apps/api/core';
import { openUrl as open } from '@tauri-apps/plugin-opener';
import { load, Store } from '@tauri-apps/plugin-store';
import { listen } from '@tauri-apps/api/event';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const SCOPES = 'https://www.googleapis.com/auth/drive.file email profile';

export interface DriveUser {
  name: string;
  emailAddress: string;
  picture: string;
}

class GoogleDriveServiceClass {
  private store: Store | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private lastRedirectUri: string = '';

  constructor() {}

  async init() {
    this.store = await load('gdrive-store.json', { autoSave: true });
  }

  async login(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        let unlisten: () => void;
        
        // Listen for the dynamic port from our Rust OAuth server
        const unlistenPromise = listen<number>('oauth-port', async (event) => {
          const port = event.payload;
          this.lastRedirectUri = `http://127.0.0.1:${port}`;
          
          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
            `client_id=${CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(this.lastRedirectUri)}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent(SCOPES)}` +
            `&access_type=offline` +
            `&prompt=consent`;

          await open(authUrl);
        });

        unlisten = await unlistenPromise;

        // Block here until the browser redirects back with the code
        const code = await invoke<string>('start_oauth_server');
        unlisten();

        // Exchange code for tokens
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: this.lastRedirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange authorization code for tokens');
        }

        const data = await response.json();
        
        if (data.refresh_token) {
          await this.store!.set('refresh_token', data.refresh_token);
          await this.store!.save();
        }
        
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async logout() {
    await this.store!.delete('refresh_token');
    await this.store!.save();
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async isAuthenticated(): Promise<boolean> {
    const hasRefreshToken = await this.store!.has('refresh_token');
    return hasRefreshToken || this.accessToken !== null;
  }

  private async getValidAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const refreshToken = await this.store!.get<string>('refresh_token');
    if (!refreshToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Failed to refresh token. User must log in again.');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    return this.accessToken!;
  }

  async getUserInfo(): Promise<DriveUser> {
    const token = await this.getValidAccessToken();
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch user info');
    
    const data = await response.json();
    let picture = data.user.photoLink;
    if (picture && picture.startsWith('//')) {
      picture = 'https:' + picture;
    }
    
    return {
      name: data.user.displayName,
      emailAddress: data.user.emailAddress,
      picture
    };
  }

  async uploadBackup(zipPath: string, manifestJson: string, customName?: string): Promise<void> {
    const token = await this.getValidAccessToken();
    const { readFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    
    const binaryData = await readFile(zipPath, { baseDir: BaseDirectory.AppData });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const safeCustomName = customName && customName.trim() ? customName.trim().replace(/[^a-zA-Z0-9 -_]/g, '') : '';
    const finalName = safeCustomName ? `Quyll_Backup_${safeCustomName}_${timestamp}.zip` : `Quyll_Backup_${timestamp}.zip`;
    
    const metadata = {
      name: finalName,
      mimeType: 'application/zip',
      description: manifestJson
    };
    
    const sessionRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': binaryData.length.toString(),
        'X-Upload-Content-Type': 'application/zip'
      },
      body: JSON.stringify(metadata)
    });
    
    if (!sessionRes.ok) throw new Error('Failed to start upload session');
    
    const uploadUrl = sessionRes.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL returned');
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': binaryData.length.toString()
      },
      body: binaryData
    });
    
    if (!uploadRes.ok) throw new Error('Failed to upload backup data');
  }

  async listBackups(): Promise<any[]> {
    const token = await this.getValidAccessToken();
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name+contains+%27Quyll_Backup%27+and+trashed%3Dfalse&orderBy=createdTime+desc&fields=files(id,name,createdTime,size,description)', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to list backups');
    const data = await response.json();
    return data.files || [];
  }

  async downloadBackup(fileId: string): Promise<string> {
    const token = await this.getValidAccessToken();
    const { writeFile, BaseDirectory, mkdir } = await import('@tauri-apps/plugin-fs');
    const { invoke } = await import('@tauri-apps/api/core');
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    
    // Create temporary backups directory
    await mkdir('Backups', { baseDir: BaseDirectory.AppData, recursive: true }).catch(() => {});
    
    const response = await tauriFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to download backup');
    const buffer = await response.arrayBuffer();
    
    const zipPath = 'Backups/temp.zip';
    const extractDir = 'Backups/Extracted';
    
    await writeFile(zipPath, new Uint8Array(buffer), { baseDir: BaseDirectory.AppData });
    
    // Call rust to extract
    await invoke('extract_backup_zip', { zipPath, extractDir });
    
    return extractDir;
  }

  async deleteBackup(fileId: string): Promise<void> {
    const token = await this.getValidAccessToken();
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    const response = await tauriFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to delete backup');
  }
}

export const GoogleDriveService = new GoogleDriveServiceClass();
