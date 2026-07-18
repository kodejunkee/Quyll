import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, Database, FileQuestion, ShieldAlert, Home } from 'lucide-react';
import { Button } from '../Button';
import './GlobalErrorBoundary.css';

export function GlobalErrorBoundary() {
  const error = useRouteError();
  console.error('[GlobalErrorBoundary]', error);

  let errorMessage = 'An unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || (typeof error.data === 'string' ? error.data : 'Route Error');
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  let title = 'Oops! Something went wrong.';
  let icon = <AlertTriangle size={32} className="global-error__icon" />;

  const lowerMsg = String(errorMessage).toLowerCase();
  if (errorMessage.includes('SQLITE') || lowerMsg.includes('database')) {
    title = 'Database Error';
    icon = <Database size={32} className="global-error__icon" />;
  } else if (errorMessage.includes('ENOENT') || lowerMsg.includes('not found')) {
    title = 'File Not Found';
    icon = <FileQuestion size={32} className="global-error__icon" />;
  } else if (lowerMsg.includes('permission') || lowerMsg.includes('access')) {
    title = 'Access Denied';
    icon = <ShieldAlert size={32} className="global-error__icon" />;
  }

  return (
    <div className="global-error">
      <div className="global-error__card">
        <div className="global-error__icon-wrapper">
          {icon}
        </div>
        <h1 className="global-error__title">{title}</h1>
        <p className="global-error__message">{errorMessage}</p>
        <div className="global-error__actions">
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = '/';
            }}
          >
            <Home size={16} />
            Return to Home
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.reload();
            }}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  );
}
