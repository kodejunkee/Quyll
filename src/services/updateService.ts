import { check, Update } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'installing' | 'error' | 'restart-required';

export interface UpdateStats {
  downloadedBytes: number;
  contentLength: number;
  speedBytesPerSec: number;
}

export class UpdateService {
  private static currentState: UpdateState = 'idle';
  private static currentUpdate: Update | null = null;
  private static listeners: Set<(state: UpdateState, progress?: number, error?: string, update?: Update, stats?: UpdateStats) => void> = new Set();

  public static subscribe(listener: (state: UpdateState, progress?: number, error?: string, update?: Update, stats?: UpdateStats) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private static emit(state: UpdateState, progress?: number, error?: string, update?: Update, stats?: UpdateStats) {
    this.currentState = state;
    if (update) this.currentUpdate = update;
    this.listeners.forEach(listener => listener(state, progress, error, this.currentUpdate || undefined, stats));
  }

  public static getState() {
    return this.currentState;
  }

  public static async getCurrentVersion() {
    return await getVersion();
  }

  public static async checkForUpdates(silent: boolean = false) {
    try {
      this.emit('checking');
      const update = await check();
      
      if (update?.available) {
        this.emit('available', undefined, undefined, update);
      } else {
        this.emit('up-to-date');
        if (silent) {
          setTimeout(() => this.emit('idle'), 3000);
        }
      }
      return update;
    } catch (err) {
      console.error('Failed to check for updates:', err);
      this.emit('error', undefined, String(err));
      return null;
    }
  }

  public static async downloadAndInstallUpdate() {
    if (!this.currentUpdate) return;
    
    try {
      let downloadedBytes = 0;
      let contentLength = 0;
      let lastTime = Date.now();
      let lastBytes = 0;
      let speedBytesPerSec = 0;
      
      await this.currentUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            this.emit('downloading', 0, undefined, undefined, { downloadedBytes, contentLength, speedBytesPerSec });
            break;
          case 'Progress':
            downloadedBytes += event.data.chunkLength;
            const now = Date.now();
            const timeDiff = now - lastTime;
            if (timeDiff > 500) {
              const bytesDiff = downloadedBytes - lastBytes;
              speedBytesPerSec = (bytesDiff / timeDiff) * 1000;
              lastTime = now;
              lastBytes = downloadedBytes;
            }
            if (contentLength) {
              const progress = Math.round((downloadedBytes / contentLength) * 100);
              this.emit('downloading', progress, undefined, undefined, { downloadedBytes, contentLength, speedBytesPerSec });
            }
            break;
          case 'Finished':
            this.emit('installing');
            break;
        }
      });
      
      this.emit('restart-required');
    } catch (err) {
      console.error('Failed to download and install update:', err);
      this.emit('error', undefined, String(err));
    }
  }

  public static async restartApp() {
    await relaunch();
  }
}
