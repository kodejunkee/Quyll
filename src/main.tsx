import { createRoot } from 'react-dom/client';
import { App } from '@/app';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@/styles/reset.css';
import '@/styles/variables.css';
import '@/styles/global.css';
import '@/styles/animations.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(<App />);
