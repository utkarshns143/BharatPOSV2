import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types';

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (product: Product, variantId: string, customQty?: number) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({ isOpen, onClose, product, onConfirm }) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [customQty, setCustomQty] = useState<number | ''>(1);

  // Reset the modal whenever a new product is selected
  useEffect(() => {
    if (isOpen && product) {
      setSelectedVariantId(product.variants[0]?.id || '');
      setCustomQty(product.isLoose ? '' : 1); // Empty box for loose items, default 1 for packed
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0];
  
  // Calculate total price based on quantity
  const currentQty = Number(customQty) || (product.isLoose ? 0 : 1);
  const displayTotal = selectedVariant.price * currentQty;

  const handleConfirm = () => {
    if (product.isLoose && !currentQty) {
      alert("Please enter a valid weight/quantity.");
      return;
    }
    onConfirm(product, selectedVariantId, currentQty);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <Card padding="1.5rem" style={{ width: '100%', maxWidth: '380px', margin: '1rem', borderTop: '4px solid var(--primary)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{product.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{product.category}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Variant Selection (Sizes/Types) */}
        {product.variants.length > 1 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
              Select Size / Option:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  style={{
                    padding: '0.75rem', borderRadius: 'var(--radius)',
                    border: selectedVariantId === v.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: selectedVariantId === v.id ? '#e0e7ff' : 'white',
                    cursor: 'pointer', fontWeight: 'bold', textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{v.quantity}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>{formatCurrency(v.price)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity / Weight Input */}
        <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
            {product.isLoose ? 'Enter Weight/Quantity (Loose):' : 'Quantity:'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input 
              type="number" 
              value={customQty} 
              onChange={(e) => setCustomQty(e.target.value ? Number(e.target.value) : '')}
              placeholder={product.isLoose ? "e.g. 2.5" : "1"}
              min="0.1" step="any"
              style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}
            />
            {product.isLoose && <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Units</span>}
          </div>
        </div>

        {/* Total & Confirm */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold' }}>Item Total:</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'monospace' }}>
            {formatCurrency(displayTotal)}
          </span>
        </div>

        <Button variant="primary" fullWidth onClick={handleConfirm} style={{ padding: '1rem', fontSize: '1.1rem' }}>
          Add to Bill
        </Button>

      </Card>
    </div>
  );
};