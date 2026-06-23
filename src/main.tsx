import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler to catch "Script error" and more
window.onerror = function(message, source, lineno, colno, error) {
  const msgStr = String(message);
  if (msgStr.toLowerCase().includes('script error')) {
    // Suppress and ignore anonymous cross-origin script error noise
    console.warn('Cross-origin/Extension Script Error suppressed:', { source, lineno, colno });
    return true; // Prevents the error from bubbling up to the browser console as uncaught
  }
  console.error('Global Error Caught:', { message, source, lineno, colno, error });
  return false; // Let the default handler run too
};

window.onunhandledrejection = function(event) {
  console.error('Unhandled Promise Rejection:', event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
