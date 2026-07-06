import { StrictMode } from 'react';
import { AppRouter } from '@/routes/AppRouter';

export function App() {
  return (
    <StrictMode>
      <AppRouter />
    </StrictMode>
  );
}
