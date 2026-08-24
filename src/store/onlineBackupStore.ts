import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DriveUser } from '@/services/googleDriveService';

interface OnlineBackupState {
  userInfo: DriveUser | null;
  backups: any[];
  isConnected: boolean;
  setUserInfo: (user: DriveUser | null) => void;
  setBackups: (backups: any[]) => void;
  setIsConnected: (isConnected: boolean) => void;
  clearState: () => void;
}

export const useOnlineBackupStore = create<OnlineBackupState>()(
  persist(
    (set) => ({
      userInfo: null,
      backups: [],
      isConnected: false,
      setUserInfo: (userInfo) => set({ userInfo }),
      setBackups: (backups) => set({ backups }),
      setIsConnected: (isConnected) => set({ isConnected }),
      clearState: () => set({ userInfo: null, backups: [], isConnected: false }),
    }),
    {
      name: 'quyll-online-backup-storage',
    }
  )
);
