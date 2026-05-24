import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ready } from '@castrater/miniapp';

// Call sdk.actions.ready() after initial render (Mini App support)
// This is a no-op when not inside a Farcaster client
ready().catch(console.warn);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
