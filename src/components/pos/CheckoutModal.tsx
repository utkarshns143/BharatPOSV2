import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  onConfirm: (paymentSplit: { cash: number; online: number; udhaar: number }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ 
  isOpen, 
  onClose, 
  cartTotal, 
  onConfirm 
}) => {
  // Local state for the inputs
  const [cash, setCash] = useState<number | ''>('');
  const [online, setOnline] = useState<number | ''>('');
  
  // Auto-calculate Udhaar (Whatever is left unpaid is Udhaar)
  const currentCash = Number(cash) || 0;
  const currentOnline = Number(online) || 0;
  const remaining = Math.max(0, cartTotal - (currentCash + currentOnline));

  // Reset inputs when the modal opens
  useEffect(() => {
    if (isOpen) {
      setCash('');
      setOnline('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickPay = (method: 'cash' | 'online') => {
    if (method === 'cash') {
      setCash(cartTotal);
      setOnline(0);
    } else {
      setOnline(cartTotal);
      setCash(0);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      cash: currentCash,
      online: currentOnline,
      udhaar: remaining,
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999, // Ensure it sits on top of everything
    }}>
      <Card padding="2rem" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Checkout</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Grand Total</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: 'monospace' }}>
            {formatCurrency(cartTotal)}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <Button variant="outline" onClick={() => handleQuickPay('cash')}>
            Full Cash
          </Button>
          <Button variant="outline" onClick={() => handleQuickPay('online')}>
            Full Online
          </Button>
        </div>

        {/* Custom Split Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--success)' }}>Cash Paid</label>
            <input 
              type="number" 
              value={cash} 
              onChange={(e) => setCash(e.target.value ? Number(e.target.value) : '')}
              placeholder="₹ 0.00"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '1.2rem', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>Online Paid</label>
            <input 
              type="number" 
              value={online} 
              onChange={(e) => setOnline(e.target.value ? Number(e.target.value) : '')}
              placeholder="₹ 0.00"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '1.2rem', fontWeight: 'bold' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#fee2e2', borderRadius: 'var(--radius)' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>Pending Udhaar:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--danger)', fontSize: '1.2rem' }}>
              {formatCurrency(remaining)}
            </span>
          </div>

        </div>

        <Button variant="primary" fullWidth onClick={handleConfirm} style={{ padding: '1rem', fontSize: '1.1rem' }}>
          Confirm Payment
        </Button>

      </Card>
    </div>
  );
};