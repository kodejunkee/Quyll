import { StrictMode } from 'react';
import { AppRouter } from '@/routes/AppRouter';
import { NotificationProvider } from '@/components/Notification';

export function App() {
  return (
    <StrictMode>
      <NotificationProvider>
        <AppRouter />
      </NotificationProvider>
    </StrictMode>
  );
}
