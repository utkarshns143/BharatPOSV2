import React, { useState, useEffect } from 'react';
import { useCustomerStore } from '../../store/useCustomerStore';
import type { Sale } from '../../types';

// Import our new safe, separated tabs
import { BillsTab } from './tabs/BillsTab';
import { StoreTab } from './tabs/StoreTab';
import { KhojTab } from './tabs/KhojTab';

import './CustomerPortal.css';

export const CustomerPortal: React.FC = () => {
  const { phone, setPhone, shopsMap, activeShopId, setActiveShopId, fetchMyKhata, logoutCustomer } = useCustomerStore();

  const [activeTab, setActiveTab] = useState<'bills' | 'store' | 'khoj'>('bills');
  const [isAuthOpen, setIsAuthOpen] = useState(!phone);
  const [authInput, setAuthInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);

  useEffect(() => {
    if (phone && phone.length === 10) {
      setIsAuthOpen(false);
      fetchMyKhata();
    }
  }, [phone, fetchMyKhata]);

  const handleLogin = () => {
    if (authInput.length !== 10) return alert("Please enter a valid 10-digit number.");
    setIsLoading(true);
    setTimeout(() => {
      setPhone(authInput);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="khata-app">
      <header className="app-header">
        <div className="app-brand">Khata</div>
        {Object.keys(shopsMap || {}).length > 0 && activeTab !== 'khoj' && (
          <div className="shop-selector-wrapper" style={{ display: 'block' }}>
            <i className="fa-solid fa-store"></i>
            <select className="shop-selector" value={activeShopId || ''} onChange={e => setActiveShopId(e.target.value)}>
              <option value="ALL">All My Shops</option>
              {/* SAFELY MAPPED SHOPS */}
              {Object.values(shopsMap || {}).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {phone && <div className="user-chip" onClick={logoutCustomer}><i className="fa-solid fa-right-from-bracket"></i></div>}
      </header>

      {/* RENDER ISOLATED TABS */}
      <BillsTab isActive={activeTab === 'bills'} onOpenReceipt={setViewingReceipt} />
      <StoreTab isActive={activeTab === 'store'} onOrderPlaced={() => setActiveTab('bills')} />
      <KhojTab isActive={activeTab === 'khoj'} />

      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveTab('bills')}><i className="fa-solid fa-file-invoice-dollar"></i><span>Bills</span></div>
        <div className={`nav-item ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}><i className="fa-solid fa-basket-shopping"></i><span>Order</span></div>
        <div className={`nav-item ${activeTab === 'khoj' ? 'active' : ''}`} onClick={() => setActiveTab('khoj')}><i className="fa-solid fa-radar"></i><span>Khoj</span></div>
      </nav>

      {/* Auth Modal */}
      {isAuthOpen && (
        <div className="khata-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="khata-modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>👋</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Welcome to Khata</h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginBottom: '24px', fontWeight: 600 }}>Enter your phone number to access your digital bills & stores.</p>
            <input type="tel" className="auth-input" value={authInput} onChange={e => setAuthInput(e.target.value)} placeholder="10-digit Mobile No." maxLength={10} />
            <button className="btn-main" onClick={handleLogin} disabled={isLoading}>{isLoading ? 'Syncing...' : 'Enter Securely ➔'}</button>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {viewingReceipt && (
        <div className="khata-modal-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="khata-modal-box" style={{ background: '#f8fafc', padding: '20px 16px' }}>
            <button className="btn-close" onClick={() => setViewingReceipt(null)}><i className="fa-solid fa-xmark"></i></button>
            <div style={{ background: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', padding: '10px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                {/* SAFE SHOP LOOKUP */}
                <h2 style={{ margin: 0, fontSize: '16px' }}>{shopsMap[viewingReceipt._branchId || '']?.name || 'Retail Store'}</h2>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>TAX INVOICE</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span>Inv: #{viewingReceipt.id.slice(-6)}</span>
                <span>Date: {new Date(viewingReceipt.timestamp).toLocaleDateString()}</span>
              </div>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead><tr style={{ borderBottom: '1px dashed #000' }}><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {/* SAFE ITEM MAPPING */}
                  {viewingReceipt.items?.map((i, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc' }}>{i.name}<br/><span style={{ fontSize: '10px', color: '#555' }}>{i.variantName}</span></td>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'center' }}>{i.qty}</td>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{i.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;