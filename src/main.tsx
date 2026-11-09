import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept fetch calls in development and production to log URL on failure
const rawFetch = window.fetch;
window.fetch = async (...args) => {
  const targetUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  try {
    return await rawFetch(...args);
  } catch (err) {
    console.error('[API FETCH FAILED ON URL]:', targetUrl, err);
    throw err;
  }
};

createRoot(document.getElementById('root')!).render(<App />);
