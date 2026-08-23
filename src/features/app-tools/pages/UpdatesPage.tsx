import { useEffect, useState } from 'react';
import { Update } from '@tauri-apps/plugin-updater';
import { openUrl as open } from '@tauri-apps/plugin-opener';
import { UpdateService, UpdateState, UpdateStats } from '@/services/updateService';
import { Button } from '@/components';
import { 
  RefreshCw, CloudDownload, ShieldCheck, Rocket, Sparkles, Bug, 
  History, ExternalLink, CheckCircle2, Download, Activity, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function UpdatesPage() {
  const [state, setState] = useState<UpdateState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState<Update | null>(null);
  const [stats, setStats] = useState<UpdateStats | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    UpdateService.getCurrentVersion().then(setCurrentVersion);
    const unsubscribe = UpdateService.subscribe((s, p, e, u, st) => {
      setState(s);
      if (p !== undefined) setProgress(p);
      if (e) setError(e);
      if (u) setUpdate(u);
      if (st) setStats(st);
    });
    
    if (UpdateService.getState() === 'idle') {
      UpdateService.checkForUpdates();
    } else {
      setState(UpdateService.getState());
      setUpdate((UpdateService as any).currentUpdate || null);
    }

    // Fetch release history
    fetch('https://api.github.com/repos/kodejunkee/Quyll/releases')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistory(data.filter(r => !r.draft));
        }
      })
      .catch(err => console.error('Failed to fetch releases:', err));
    
    return unsubscribe;
  }, []);

  const handleCheck = () => {
    setError(null);
    UpdateService.checkForUpdates();
  };

  const handleInstall = () => {
    UpdateService.downloadUpdate();
  };

  const handleRestart = () => {
    UpdateService.installAndRestart();
  };

  const getRemainingTime = () => {
    if (!stats || stats.speedBytesPerSec === 0) return 'Calculating...';
    const remainingBytes = stats.contentLength - stats.downloadedBytes;
    const remainingSeconds = remainingBytes / stats.speedBytesPerSec;
    if (remainingSeconds < 60) return 'Less than 1 min remaining';
    return `${Math.ceil(remainingSeconds / 60)} min remaining`;
  };

  const styles = `
    .updates-page {
      padding: var(--space-6) var(--space-8);
      max-width: 990px;
      color: var(--color-text);
      font-family: var(--font-sans);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 24px;
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
    .circular-progress {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: conic-gradient(var(--color-primary) calc(var(--progress) * 1%), var(--color-border-subtle) 0);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .circular-progress::before {
      content: '';
      position: absolute;
      width: 88px;
      height: 88px;
      background: var(--color-bg-surface);
      border-radius: 50%;
    }
    .circular-progress > svg {
      position: relative;
      z-index: 1;
      color: var(--color-primary);
    }
    
    .linear-progress-container {
      height: 8px;
      background: var(--color-border-subtle);
      border-radius: 4px;
      overflow: hidden;
      flex: 1;
    }
    .linear-progress-bar {
      height: 100%;
      background: var(--color-primary);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .feature-card {
      background: var(--color-bg-surface);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--color-border-subtle);
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transition: border-color var(--transition-fast);
    }
    .feature-card:hover {
      border-color: var(--color-primary);
    }
    .feature-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--color-primary-subtle);
      color: var(--color-primary);
    }
    .history-section {
      background: var(--color-bg-surface);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--color-border-subtle);
    }
    .history-item {
      display: flex;
      align-items: center;
    }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--color-primary-subtle);
      color: var(--color-text);
      border: 1px solid var(--color-primary);
      font-weight: 600;
      margin-left: 8px;
    }
    .text-primary {
      color: var(--color-primary);
    }
    .text-secondary {
      color: var(--color-text-secondary);
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .spin { animation: spin 2s linear infinite; }
  `;

  return (
    <div className="updates-page">
      <style>{styles}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="header-icon-box">
          <RefreshCw size={24} className={state === 'checking' ? 'spin' : ''} />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Updates</h2>
          <p className="text-secondary" style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Keep Quyll up to date with the latest features and fixes.</p>
        </div>
      </div>

      {/* Main Banner */}
      <div className="main-banner">
        <div className="circular-progress" style={{ '--progress': (state === 'downloading' || state === 'installing' || state === 'restart-required') ? progress : (state === 'up-to-date' ? 100 : 0) } as any}>
          {(state === 'up-to-date' || state === 'restart-required') ? <CheckCircle2 size={32} /> : <CloudDownload size={32} />}
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>
                {state === 'checking' && 'Checking for Updates...'}
                {state === 'up-to-date' && 'Quyll is Up to Date'}
                {state === 'available' && 'Update Available'}
                {state === 'downloading' && 'Downloading Update'}
                {state === 'installing' && 'Installing Update...'}
                {state === 'restart-required' && 'Restart Required'}
                {state === 'error' && 'Update Failed'}
              </h3>
              
              {state === 'available' && update && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="badge">New Version {update.version}</span>
                </div>
              )}
              
              <p className="text-secondary" style={{ margin: 0, fontSize: '14px' }}>
                {state === 'checking' && 'Looking for the latest improvements.'}
                {state === 'up-to-date' && `You are running version ${currentVersion}.`}
                {state === 'available' && 'A new version is ready to install.'}
                {state === 'downloading' && "We're downloading the latest update."}
                {state === 'installing' && "Applying the new changes to Quyll."}
                {state === 'restart-required' && "The update is ready! Restart to apply."}
                {state === 'error' && error}
              </p>
            </div>
            
            {/* Action Button */}
            <div>
              {(state === 'idle' || state === 'up-to-date' || state === 'error' || state === 'checking') && (
                <Button onClick={handleCheck} variant="secondary" style={{ minWidth: '150px' }} disabled={state === 'checking'}>
                  {state === 'checking' ? 'Checking...' : 'Check for Updates'}
                </Button>
              )}
              {state === 'available' && (
                <Button onClick={handleInstall} variant="primary" style={{ minWidth: '150px' }}>
                  Download & Install
                </Button>
              )}
              {state === 'restart-required' && (
                <Button onClick={handleRestart} variant="primary" style={{ minWidth: '150px' }}>
                  Restart Quyll
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar Area */}
          {(state === 'downloading' || state === 'installing' || state === 'restart-required') && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div className="linear-progress-container">
                  <div className="linear-progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-primary" style={{ fontWeight: 600 }}>{progress}%</span>
              </div>
              
              {state === 'downloading' && stats && (
                <div className="text-secondary" style={{ display: 'flex', gap: '24px', fontSize: '13px', marginTop: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={14} /> {formatBytes(stats.downloadedBytes)} of {formatBytes(stats.contentLength)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} /> {formatBytes(stats.speedBytesPerSec)}/s
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> {getRemainingTime()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Safe & Secure</div>
            <div className="text-secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>Updates are scanned and verified.</div>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <Rocket size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Performance</div>
            <div className="text-secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>Improved stability and speed.</div>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>New Features</div>
            <div className="text-secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>Exciting tools to boost your creativity.</div>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <Bug size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Bug Fixes</div>
            <div className="text-secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>Squashing bugs for a smoother experience.</div>
          </div>
        </div>
      </div>

      {/* Update History */}
      <div className="history-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <History size={20} className="text-secondary" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Update History</h3>
              <p className="text-secondary" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>See what's new in recent updates.</p>
            </div>
          </div>
          <Button onClick={() => open('https://github.com/kodejunkee/Quyll/releases')} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>
            View All Releases <ExternalLink size={14} />
          </Button>
        </div>

        <div>
          {history.length > 0 ? (
            history.map((release, index) => {
              const isLatest = index === 0;
              const isInstalled = release.tag_name === `v${currentVersion}` || release.name.includes(currentVersion);
              const isUpdate = update && (release.tag_name === `v${update.version}` || release.name.includes(update.version));
              const isExpanded = expandedNotes === release.id;
              
              const formattedDate = new Date(release.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

              return (
                <div key={release.id} style={{ borderBottom: index < history.length - 1 ? '1px solid var(--color-border-subtle)' : 'none', paddingBottom: index < history.length - 1 ? '16px' : '0', paddingTop: index > 0 ? '16px' : '0' }}>
                  <div className="history-item">
                    <CheckCircle2 size={16} color="var(--color-success)" style={{ marginRight: '16px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{release.name || release.tag_name}</span>
                        {isLatest && <span className="badge">Latest</span>}
                      </div>
                      <div className="text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>
                        {isUpdate ? 'Update Available' : isInstalled ? 'Currently Installed' : `Released on ${formattedDate}`}
                      </div>
                    </div>
                    <div className="text-primary" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }} onClick={() => setExpandedNotes(isExpanded ? null : release.id)}>
                      {isExpanded ? 'Hide notes' : 'See what\'s new >'}
                    </div>
                  </div>
                  
                  {isExpanded && release.body && (
                    <div style={{ padding: '16px', background: 'var(--color-bg-hover)', borderRadius: '8px', marginTop: '16px', fontSize: '14px', border: '1px solid var(--color-border-subtle)' }}>
                      <ReactMarkdown>{release.body}</ReactMarkdown>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Fallback while fetching or if fetch fails
            <>
              {update ? (
                <div className="history-item">
                  <CheckCircle2 size={16} color="var(--color-success)" style={{ marginRight: '16px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>Quyll {update.version}</span>
                      <span className="badge">Latest</span>
                    </div>
                    <div className="text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>Update Available</div>
                  </div>
                  <div className="text-primary" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }} onClick={() => setExpandedNotes(expandedNotes === 'update' ? null : 'update')}>
                    {expandedNotes === 'update' ? 'Hide notes' : 'See what\'s new >'}
                  </div>
                </div>
              ) : (
                <div className="history-item">
                  <CheckCircle2 size={16} color="var(--color-success)" style={{ marginRight: '16px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>Quyll {currentVersion}</span>
                      <span className="badge">Latest</span>
                    </div>
                    <div className="text-secondary" style={{ fontSize: '13px', marginTop: '4px' }}>Currently Installed</div>
                  </div>
                </div>
              )}
              {expandedNotes === 'update' && update && update.body && (
                <div style={{ padding: '16px', background: 'var(--color-bg-hover)', borderRadius: '8px', marginTop: '16px', fontSize: '14px', border: '1px solid var(--color-border-subtle)' }}>
                  <ReactMarkdown>{update.body}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
