// File: src/customer-main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CustomerPortal } from './pages/customer/CustomerPortal';
import './assets/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CustomerPortal />
  </React.StrictMode>
);