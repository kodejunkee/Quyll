import { useEffect, useState } from 'react';
import { Update } from '@tauri-apps/plugin-updater';
import { UpdateService, UpdateState } from '@/services/updateService';
import { Button } from '@/components';
import { ReloadIcon, CheckCircledIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';

export function UpdatesPage() {
  const [state, setState] = useState<UpdateState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState<Update | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  const styles = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes ellipsis {
      0% { content: ''; }
      25% { content: '.'; }
      50% { content: '..'; }
      75% { content: '...'; }
      100% { content: ''; }
    }
    .animated-ellipsis::after {
      content: '';
      animation: ellipsis 1.5s infinite;
      display: inline-block;
      width: 1em;
      text-align: left;
    }
  `;

  useEffect(() => {
    UpdateService.getCurrentVersion().then(setCurrentVersion);
    const unsubscribe = UpdateService.subscribe((s, p, e, u) => {
      setState(s);
      if (p !== undefined) setProgress(p);
      if (e) setError(e);
      if (u) setUpdate(u);
    });
    
    // Auto check if we're just visiting the page and haven't checked yet
    if (UpdateService.getState() === 'idle') {
      UpdateService.checkForUpdates();
    } else {
      setState(UpdateService.getState());
    }
    
    return unsubscribe;
  }, []);

  const handleCheck = () => {
    setError(null);
    UpdateService.checkForUpdates();
  };

  const handleInstall = () => {
    UpdateService.downloadAndInstallUpdate();
  };

  const handleRestart = () => {
    UpdateService.restartApp();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-6) var(--space-8)',
      boxSizing: 'border-box',
      maxWidth: '600px',
      gap: '24px'
    }}>
      <style>{styles}</style>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#E2E8F0', marginBottom: '8px' }}>Updates</h2>
        <p style={{ color: '#94A3B8' }}>Keep Quyll up to date with the latest features and fixes.</p>
      </div>

      <div style={{
        background: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>
              {state === 'checking' && <span>Checking for Updates<span className="animated-ellipsis" /></span>}
              {state === 'up-to-date' && 'You\'re Up to Date'}
              {(state === 'available' || state === 'downloading' || state === 'installing' || state === 'restart-required') && 'Update Available'}
              {state === 'error' && 'Update Failed'}
              {state === 'idle' && 'Check for Updates'}
            </h3>
            <p style={{ color: '#94A3B8', margin: '4px 0 0 0', fontSize: '14px' }}>
              Quyll {currentVersion}
            </p>
          </div>
          
          {state === 'up-to-date' && <CheckCircledIcon width={24} height={24} color="#10B981" />}
          {(state === 'available' || state === 'downloading' || state === 'installing' || state === 'restart-required') && <InfoCircledIcon width={24} height={24} color="#3B82F6" />}
          {state === 'error' && <ExclamationTriangleIcon width={24} height={24} color="#EF4444" />}
          {state === 'checking' && <ReloadIcon width={24} height={24} className="spin" color="#A855F7" />}
        </div>

        {update && state === 'available' && (
          <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Quyll {update.version}</h4>
            <div style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: '1.5' }}>
              <strong>What's New</strong>
              <ReactMarkdown>{update.body || 'No release notes provided.'}</ReactMarkdown>
            </div>
          </div>
        )}

        {state === 'downloading' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Downloading Update<span className="animated-ellipsis" /></span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#3B82F6', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        {state === 'installing' && (
          <div style={{ marginBottom: '24px', fontSize: '14px', color: '#94A3B8' }}>
            Installing Update<span className="animated-ellipsis" />
          </div>
        )}

        {state === 'error' && error && (
          <div style={{ marginBottom: '24px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#FCA5A5', borderRadius: 'var(--radius-md)', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {state === 'restart-required' && (
          <div style={{ marginBottom: '24px', fontSize: '14px', color: '#10B981' }}>
            Update installed. Please restart Quyll to apply changes.
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          {(state === 'idle' || state === 'up-to-date' || state === 'error' || state === 'checking') && (
            <Button onClick={handleCheck} disabled={state === 'checking'} style={{ minWidth: '170px' }}>
              {state === 'checking' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <ReloadIcon width={14} height={14} className="spin" />
                  <span>Checking<span className="animated-ellipsis" /></span>
                </div>
              ) : (
                'Check for Updates'
              )}
            </Button>
          )}
          
          {state === 'available' && (
            <Button onClick={handleInstall} variant="primary">
              Update Now
            </Button>
          )}

          {state === 'restart-required' && (
            <Button onClick={handleRestart} variant="primary">
              Restart Quyll
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
