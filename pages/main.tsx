import { createRoot } from 'react-dom/client';
import GearApp from '../app/gear-app';
import { assetUrl } from '../lib/runtime';
import '../app/globals.css';
createRoot(document.getElementById('root')!).render(<GearApp />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(assetUrl('/sw.js'));
  });
}
