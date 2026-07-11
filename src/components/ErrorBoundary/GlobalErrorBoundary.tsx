import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { Button } from '../Button';
import './GlobalErrorBoundary.css';

export function GlobalErrorBoundary() {
  const error = useRouteError();
  console.error('[GlobalErrorBoundary]', error);

  let errorMessage = 'An unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="global-error">
      <div className="global-error__card">
        <div className="global-error__icon-wrapper">
          <AlertTriangle size={32} className="global-error__icon" />
        </div>
        <h1 className="global-error__title">Oops! Something went wrong.</h1>
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
