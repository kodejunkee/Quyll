import { useState, useEffect } from 'react';
import { Button, Modal } from '@/components';
import { Cloud, CheckCircle2, HardDrive, RefreshCw, LogOut, ArrowUpCircle, DownloadCloud, AlertTriangle, Trash2 } from 'lucide-react';
import { GoogleDriveService, DriveUser } from '@/services/googleDriveService';
import { invoke } from '@tauri-apps/api/core';
import { useOnlineBackupStore } from '@/store/onlineBackupStore';

export function OnlineBackupPage() {
  const { userInfo, backups, isConnected, setUserInfo, setBackups, setIsConnected, clearState } = useOnlineBackupStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // Restore State
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreProjects, setRestoreProjects] = useState<any[]>([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [isRestoring, setIsRestoring] = useState(false);
  
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await GoogleDriveService.init();
      const auth = await GoogleDriveService.isAuthenticated();
      setIsConnected(auth);
      if (auth) {
        fetchUserInfo();
        fetchBackups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const user = await GoogleDriveService.getUserInfo();
      setUserInfo(user);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setIsConnected(false);
      throw err;
    }
  };

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await GoogleDriveService.listBackups();
      setBackups(list);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await GoogleDriveService.login();
      setIsConnected(true);
      await fetchUserInfo();
      await fetchBackups();
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Drive');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await GoogleDriveService.logout();
    clearState();
  };

  // Backup Settings State
  const [showBackupSettingsModal, setShowBackupSettingsModal] = useState(false);
  const [backupSettingsName, setBackupSettingsName] = useState('');
  const [backupSettingsProjects, setBackupSettingsProjects] = useState<Set<string>>(new Set());
  const [localProjects, setLocalProjects] = useState<any[]>([]);

  const openBackupSettings = async () => {
    try {
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      const db = await Database.load(`sqlite:app.db`);
      const projects = await db.select<any[]>('SELECT id, name, genre FROM projects WHERE deleted_at IS NULL');
      setLocalProjects(projects);
      
      // Default to all if none selected yet
      if (backupSettingsProjects.size === 0) {
        setBackupSettingsProjects(new Set(projects.map(p => p.id)));
      }
      setBackupSettingsName('');
      setShowBackupSettingsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBackupProject = (id: string) => {
    const next = new Set(backupSettingsProjects);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setBackupSettingsProjects(next);
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      const db = await Database.load(`sqlite:app.db`);
      const allP = await db.select<any[]>('SELECT id, name, genre FROM projects WHERE deleted_at IS NULL');
      
      const projectsToBackup = backupSettingsProjects.size > 0 
        ? allP.filter(p => backupSettingsProjects.has(p.id)) 
        : allP;
        
      const manifestObj = {
        customName: backupSettingsName.trim() || undefined,
        projects: projectsToBackup
      };
      const manifestJson = JSON.stringify(manifestObj);

      const pIds = backupSettingsProjects.size > 0 ? Array.from(backupSettingsProjects) : undefined;
      
      const SqlDatabase = (await import('@tauri-apps/plugin-sql')).default;
      const liveDb = await SqlDatabase.load(`sqlite:app.db`);
      await liveDb.execute('PRAGMA wal_checkpoint(TRUNCATE)');
      
      const zipPath = await invoke<string>('create_backup_zip', { projectIds: pIds });
      await GoogleDriveService.uploadBackup(zipPath, manifestJson, backupSettingsName.trim() || undefined);
      await fetchBackups();
      
      setShowBackupSettingsModal(false);
    } catch (err) {
      console.error('Backup failed:', err);
    } finally {
      setIsBackingUp(false);
    }
  };

  const [activeBackupId, setActiveBackupId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this backup from Google Drive?")) return;
    
    setIsDeletingId(backupId);
    try {
      await GoogleDriveService.deleteBackup(backupId);
      await fetchBackups();
    } catch (err) {
      console.error('Failed to delete backup:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleStartRestore = (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (backup && backup.description) {
      try {
        const parsed = JSON.parse(backup.description);
        const projects = Array.isArray(parsed) ? parsed : (parsed.projects || []);
        setRestoreProjects(projects);
        setSelectedProjectIds(new Set(projects.map((p: any) => p.id)));
        setActiveBackupId(backupId);
        setShowRestoreModal(true);
      } catch (e) {
        console.error("Failed to parse backup metadata", e);
        alert("This backup's metadata is corrupted or missing.");
      }
    } else {
      alert("This is an old backup without metadata. Please create a new backup to use granular restore.");
    }
  };

  const toggleProjectSelection = (id: string) => {
    const next = new Set(selectedProjectIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProjectIds(next);
  };

  const executeRestore = async () => {
    if (!activeBackupId) return;
    const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    setIsRestoring(true);
    let debugLog = "";
    try {
      debugLog += `Starting restore for backup: ${activeBackupId}\n`;
      const extractedPath = await GoogleDriveService.downloadBackup(activeBackupId);
      debugLog += `Extracted to: ${extractedPath}\n`;
      
      const pIds = Array.from(selectedProjectIds);
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      
      // We MUST close any open connections to these projects before trying to overwrite them!
      // Otherwise Windows will throw "os error 32" (File is in use).
      for (const id of pIds) {
        try {
          const pDb = await Database.load(`sqlite:projects/${id}.quyll/project.db`);
          await pDb.close();
        } catch (e) {
          // Ignore if the database doesn't exist or isn't loaded
        }
      }
      
      debugLog += `Target project IDs: ${JSON.stringify(pIds)}\n`;
      await invoke('restore_project_folders', { projectIds: pIds });
      debugLog += `Restored folders.\n`;
      
      const SqlDatabase = (await import('@tauri-apps/plugin-sql')).default;
      const extractDb = await SqlDatabase.load(`sqlite:${extractedPath}/app.db`);
      const liveDb = await SqlDatabase.load(`sqlite:app.db`);
      debugLog += `Loaded databases.\n`;
      
      for (const id of pIds) {
        debugLog += `Checking ID: ${id}\n`;
        const rows = await extractDb.select<any[]>('SELECT * FROM projects WHERE id = $1', [id]);
        debugLog += `Rows found: ${rows.length}\n`;
        if (rows.length > 0) {
          const p = rows[0];
          debugLog += `Project name: ${p.name}\n`;
          await liveDb.execute(`
            INSERT INTO projects (id, name, path, description, author, genre, cover_image, last_opened_at, created_at, updated_at, deleted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              path = excluded.path,
              description = excluded.description,
              author = excluded.author,
              genre = excluded.genre,
              cover_image = excluded.cover_image,
              last_opened_at = excluded.last_opened_at,
              updated_at = excluded.updated_at,
              deleted_at = excluded.deleted_at
          `, [
            p.id, 
            p.name, 
            p.path, 
            p.description ?? '', 
            p.author ?? '',
            p.genre ? (typeof p.genre === 'string' ? p.genre : JSON.stringify(p.genre)) : '[]', 
            p.cover_image ?? null, 
            p.last_opened_at ?? null,
            p.created_at ?? new Date().toISOString(), 
            p.updated_at ?? new Date().toISOString(), 
            p.deleted_at ?? null
          ]);
        }
      }
      
      await extractDb.close();
      
      await writeTextFile('restore-debug.txt', debugLog, { baseDir: BaseDirectory.AppData });
      setShowRestoreModal(false);
      window.location.reload();
    } catch (err) {
      debugLog += `Error: ${err}\n`;
      await writeTextFile('restore-debug.txt', debugLog, { baseDir: BaseDirectory.AppData });
      console.error(err);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatSize = (bytes: string | number) => {
    const num = Number(bytes);
    if (!num) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const styles = `
    .backup-page {
      padding: var(--space-6) var(--space-8);
      max-width: 990px;
      color: var(--color-text);
      font-family: var(--font-sans);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    .backup-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: 8px;
      padding: 12px 16px;
      transition: border-color 0.2s;
    }
    .backup-item:hover {
      border-color: var(--color-primary);
    }
    .project-check-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--color-border-subtle);
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 8px;
    }
    .header-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--color-primary-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
    }
    .main-banner {
      background: linear-gradient(135deg, var(--color-primary-subtle), var(--color-bg-surface));
      border-radius: 16px;
      padding: 32px;
      border: 1px solid var(--color-border-subtle);
      display: flex;
      gap: 32px;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .status-icon-container {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: var(--color-bg-surface);
      border: 2px dashed var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .status-icon-container.connected {
      border: 2px solid var(--color-success);
      background: var(--color-primary-subtle);
    }
    .status-icon-container > svg {
      color: var(--color-primary);
    }
    .status-icon-container.connected > svg {
      color: var(--color-success);
    }
    .backup-card {
      background: var(--color-bg-surface);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid var(--color-border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  `;

  return (
    <div className="backup-page">
      <style>{styles}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="header-icon-box">
          <Cloud size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 4px 0' }}>Cloud Backup</h1>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Keep your projects safe by syncing them to your Google Drive.</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="main-banner">
          <div className="status-icon-container">
            <Cloud size={36} />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>Google Drive Disconnected</h2>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
                  Link your Google Drive account to seamlessly back up your workspaces and projects. Your data remains 100% private and in your control.
                </p>
                {error && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '8px', fontWeight: 500 }}>
                    {error}
                  </div>
                )}
              </div>
              <div>
                <Button onClick={handleConnect} variant="primary" style={{ minWidth: '150px' }} disabled={isConnecting}>
                  {isConnecting ? (
                    <><RefreshCw size={14} className="spin" style={{ marginRight: '8px' }} /> Connecting...</>
                  ) : 'Connect Google Drive'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="main-banner">
            <div className="status-icon-container connected">
              <CheckCircle2 size={36} />
            </div>
            
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Connected to Google Drive</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.5, maxWidth: '500px' }}>
                Your account is linked. You can safely backup and restore your Quyll data directly from your personal Drive.
              </p>
            </div>
            <Button onClick={handleDisconnect} variant="secondary" style={{ padding: '8px 16px' }}>
              <LogOut size={16} style={{ marginRight: '8px' }} /> Disconnect
            </Button>
          </div>

          <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {userInfo?.picture ? (
                <img src={userInfo.picture.startsWith('//') ? 'https:' + userInfo.picture : userInfo.picture} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%' }} crossOrigin="anonymous" referrerPolicy="no-referrer" />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{userInfo?.name || 'Loading...'}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{userInfo?.emailAddress}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={openBackupSettings} variant="primary" style={{ padding: '8px 16px', minWidth: '120px' }} disabled={isBackingUp}>
                {isBackingUp ? (
                  <><RefreshCw size={14} className="spin" style={{ marginRight: '8px' }} /> Backing up...</>
                ) : (
                  <><ArrowUpCircle size={14} style={{ marginRight: '8px' }} /> Backup</>
                )}
              </Button>
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Recent Backups</h3>
              <Button onClick={fetchBackups} variant="secondary" style={{ padding: '4px 8px', fontSize: '12px' }} disabled={isLoadingBackups}>
                <RefreshCw size={12} className={isLoadingBackups ? 'spin' : ''} style={{ marginRight: '6px' }} /> Refresh
              </Button>
            </div>
            
            {backups.length === 0 ? (
              <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                <HardDrive size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <div style={{ fontWeight: 500 }}>No backups found</div>
                <div className="text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>Click "Backup" to create your first backup.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {backups.map(backup => (
                  <div key={backup.id} className="backup-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: 'var(--color-primary)' }}><Cloud size={20} /></div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>
                          {(() => {
                            if (backup.description) {
                              try {
                                const parsed = JSON.parse(backup.description);
                                if (parsed.customName) return parsed.customName;
                              } catch {}
                            }
                            return backup.name;
                          })()}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '12px' }}>{formatDate(backup.createdTime)} • {formatSize(backup.size)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button 
                        onClick={() => handleStartRestore(backup.id)} 
                        variant="secondary" 
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        <DownloadCloud size={14} style={{ marginRight: '6px' }} /> Restore
                      </Button>
                      <Button 
                        onClick={() => handleDeleteBackup(backup.id)} 
                        variant="ghost" 
                        style={{ padding: '6px', color: 'var(--color-danger)' }}
                        disabled={isDeletingId === backup.id}
                        title="Delete Backup"
                      >
                        {isDeletingId === backup.id ? <RefreshCw size={14} className="spin" /> : <Trash2 size={14} />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal title="Select Projects to Restore" open={showRestoreModal} onClose={() => { if (!isRestoring) setShowRestoreModal(false); }}>
        <div style={{ paddingTop: '20px' }}>
          
          <div style={{ padding: '12px 16px', background: 'rgba(255, 165, 0, 0.1)', color: 'orange', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '12px', fontSize: '14px', lineHeight: 1.5 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div>Restoring a project will <strong>overwrite</strong> any current local version of that project. Proceed carefully.</div>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {restoreProjects.map(p => (
              <div 
                key={p.id}
                onClick={() => toggleProjectSelection(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  border: `1px solid ${selectedProjectIds.has(p.id) ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedProjectIds.has(p.id) ? 'rgba(46, 204, 113, 0.05)' : 'transparent',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px',
                  border: `2px solid ${selectedProjectIds.has(p.id) ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: selectedProjectIds.has(p.id) ? 'var(--color-primary)' : 'transparent',
                }}>
                  {selectedProjectIds.has(p.id) && <CheckCircle2 size={14} color="white" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {(() => {
                      try {
                        const parsed = JSON.parse(p.genre);
                        return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(', ') : 'No genre';
                      } catch {
                        return p.genre || 'No genre';
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={() => setShowRestoreModal(false)} variant="secondary">Cancel</Button>
            <Button onClick={executeRestore} variant="primary" disabled={isRestoring || selectedProjectIds.size === 0}>
              {isRestoring ? 'Downloading & Restoring...' : `Restore ${selectedProjectIds.size} Project${selectedProjectIds.size === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal title="Create Backup" open={showBackupSettingsModal} onClose={() => { if (!isBackingUp) setShowBackupSettingsModal(false); }}>
        <div style={{ paddingTop: '20px' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Custom Backup Name (Optional)</label>
            <input 
              type="text" 
              value={backupSettingsName}
              onChange={e => setBackupSettingsName(e.target.value)}
              placeholder="e.g. Before Revisions"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px', 
                border: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-inset)',
                color: 'white', fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>

          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Select Projects to Backup</label>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {localProjects.map(p => (
              <div 
                key={p.id}
                onClick={() => toggleBackupProject(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px',
                  border: `1px solid ${backupSettingsProjects.has(p.id) ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                  borderRadius: '8px', cursor: 'pointer',
                  background: backupSettingsProjects.has(p.id) ? 'rgba(46, 204, 113, 0.05)' : 'transparent',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px',
                  border: `2px solid ${backupSettingsProjects.has(p.id) ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: backupSettingsProjects.has(p.id) ? 'var(--color-primary)' : 'transparent',
                }}>
                  {backupSettingsProjects.has(p.id) && <CheckCircle2 size={14} color="white" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {(() => {
                      try {
                        const parsed = JSON.parse(p.genre);
                        return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(', ') : 'No genre';
                      } catch {
                        return p.genre || 'No genre';
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={() => setShowBackupSettingsModal(false)} variant="secondary" disabled={isBackingUp}>Cancel</Button>
            <Button onClick={handleBackup} variant="primary" disabled={backupSettingsProjects.size === 0 || isBackingUp}>
              {isBackingUp ? (
                <><RefreshCw size={14} className="spin" style={{ marginRight: '8px' }} /> Backing up...</>
              ) : (
                <><ArrowUpCircle size={14} style={{ marginRight: '8px' }} /> Backup Now</>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
