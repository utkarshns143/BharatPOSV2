import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  customerPhone: string;
  onConfirm: (method: string, split?: { cash: number, online: number, udhaar: number }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartTotal, customerPhone, onConfirm }) => {
  const [cash, setCash] = useState<string>('');
  const [online, setOnline] = useState<string>('');
  const [udhaar, setUdhaar] = useState<string>('');

  // Auto-calculate Udhaar when Cash or Online changes
  useEffect(() => {
    if (isOpen) {
      setCash(String(cartTotal));
      setOnline('');
      setUdhaar('0');
    }
  }, [isOpen, cartTotal]);

  const handleCashChange = (val: string) => {
    const c = Number(val) || 0;
    setCash(val);
    setOnline(''); // reset online when manually typing cash
    setUdhaar(String(Math.max(0, cartTotal - c)));
  };

  const handleOnlineChange = (val: string) => {
    const c = Number(cash) || 0;
    const o = Number(val) || 0;
    setOnline(val);
    setUdhaar(String(Math.max(0, cartTotal - c - o)));
  };

  const handleConfirm = () => {
    const totalInput = (Number(cash) || 0) + (Number(online) || 0) + (Number(udhaar) || 0);
    if (Math.abs(totalInput - cartTotal) > 0.01) return alert("Amounts must equal Grand Total");
    if ((Number(udhaar) || 0) > 0 && customerPhone.length !== 10) return alert("Customer 10-digit mobile required for Udhaar");
    
    onConfirm('Partial', { cash: Number(cash) || 0, online: Number(online) || 0, udhaar: Number(udhaar) || 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-box" style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}><i className="fa-solid fa-calculator" style={{ color: 'var(--primary)' }}></i> Partial / Mix Payment</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Grand Total To Pay</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(cartTotal)}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
            <div style={{ position: 'relative' }}>
              <input type="number" value={cash} onChange={e => handleCashChange(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '18px', fontWeight: 800, color: 'var(--success)', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', boxSizing: 'border-box' }} placeholder=" " />
              <label style={{ position: 'absolute', top: '14px', left: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}><i className="fa-solid fa-money-bill-wave"></i> Cash Amount</label>
            </div>
            
            <div style={{ position: 'relative' }}>
              <input type="number" value={online} onChange={e => handleOnlineChange(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '18px', fontWeight: 800, color: 'var(--purple)', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', boxSizing: 'border-box' }} placeholder=" " />
              <label style={{ position: 'absolute', top: '14px', left: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}><i className="fa-solid fa-qrcode"></i> Online Amount</label>
            </div>

            <div style={{ position: 'relative' }}>
              <input type="number" value={udhaar} readOnly style={{ width: '100%', padding: '14px', fontSize: '18px', fontWeight: 800, color: 'var(--danger)', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} placeholder=" " />
              <label style={{ position: 'absolute', top: '14px', left: '16px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, pointerEvents: 'none' }}><i className="fa-solid fa-book-open"></i> Udhaar Amount</label>
            </div>
        </div>

        <button onClick={handleConfirm} style={{ width: '100%', padding: '16px', borderRadius: '8px', background: 'var(--primary)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '14px' }}>
          <i className="fa-solid fa-check-circle"></i> Save Mix Payment
        </button>
      </div>
    </div>
  );
};