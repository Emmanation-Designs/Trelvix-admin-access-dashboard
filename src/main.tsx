import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safety fetch interceptor: rewrites any mistyped Supabase domains and logs errors
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  let url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
  if (url.includes('wxezfzhhzlauggufemm.supabase.co')) {
    url = url.replace('wxezfzhhzlauggufemm.supabase.co', 'wxezfzhhzlauggufecmm.supabase.co');
    if (typeof input === 'string') {
      input = url;
    } else if (input instanceof Request) {
      input = new Request(url, input);
    }
  }

  try {
    return await originalFetch(input, init);
  } catch (err) {
    console.error('[API FETCH FAILED ON URL]:', url, err);
    throw err;
  }
};

createRoot(document.getElementById('root')!).render(<App />);
