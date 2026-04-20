/// <reference types="vite-plugin-pwa/client" />
import React from 'react';
// This is a virtual module provided by the Vite PWA plugin
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  // If there is no new version waiting, don't render anything!
  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '320px',
      border: '1px solid #334155'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ fontSize: '1.5rem' }}>🚀</div>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>Update Available!</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            A new version of BharatPOS is ready. Update now to get the latest features and bug fixes.
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setNeedRefresh(false)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
        >
          Dismiss
        </button>
        <button 
          onClick={() => updateServiceWorker(true)}
          style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
        >
          Update & Restart
        </button>
      </div>
    </div>
  );
};