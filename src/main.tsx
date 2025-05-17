import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { VideoCallProvider } from './context/VideoCallContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <VideoCallProvider>
          <App />
        </VideoCallProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);