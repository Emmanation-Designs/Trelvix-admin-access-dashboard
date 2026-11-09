import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safety fetch wrapper with defensive try/catch for iframe environments
try {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    const safeFetch: typeof window.fetch = async (input, init) => {
      let url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (typeof url === 'string' && url.includes('wxezfzhhzlauggufemm.supabase.co')) {
        const correctedUrl = url.replace('wxezfzhhzlauggufemm.supabase.co', 'wxezfzhhzlauggufecmm.supabase.co');
        if (typeof input === 'string') {
          input = correctedUrl;
        } else if (input instanceof Request) {
          input = new Request(correctedUrl, input);
        }
      }

      try {
        return await originalFetch(input, init);
      } catch (err) {
        console.error('[API FETCH FAILED ON URL]:', url, err);
        throw err;
      }
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: safeFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      // In sandbox iframes where window.fetch is non-configurable, fallback without error
    }
  }
} catch (e) {
  console.warn('[Fetch Interceptor Notice]:', e);
}

createRoot(document.getElementById('root')!).render(<App />);
