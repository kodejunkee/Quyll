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
import '@xyflow/react/dist/style.css';


const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Disable native context menu everywhere except in the editor and inputs
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  const isEditable = target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  
  if (!isEditable) {
    e.preventDefault();
  }
});

createRoot(root).render(<App />);
