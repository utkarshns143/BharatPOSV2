// File: src/customer-main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CustomerPortal } from './pages/customer/CustomerPortal';
import { PwaUpdatePrompt } from './components/shared/PwaUpdatePrompt';
import './assets/global.css'; // Global resets

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* This gives customers the "Update Available" popup when you push new code! */}
    <PwaUpdatePrompt /> 
    <CustomerPortal />
  </React.StrictMode>
);