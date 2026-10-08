import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent pinch-to-zoom and double-tap zoom gestures globally on mobile Chrome / Safari
if (typeof window !== 'undefined') {
  document.addEventListener('gesturestart', (e: any) => e.preventDefault());
  document.addEventListener('gesturechange', (e: any) => e.preventDefault());
  document.addEventListener('gestureend', (e: any) => e.preventDefault());

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });
}

createRoot(document.getElementById('root')!).render(<App />);
