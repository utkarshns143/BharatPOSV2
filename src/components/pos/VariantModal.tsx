import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types';

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (product: Product, variantId: string, customQty: number) => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({ isOpen, onClose, product, onConfirm }) => {
  const [step, setStep] = useState<'variant' | 'qty'>('variant');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [customQty, setCustomQty] = useState<string>('1');

  useEffect(() => {
    if (isOpen && product) {
      if (product.variants.length > 1) {
        setStep('variant');
        setSelectedVariantId('');
        setCustomQty(product.isLoose ? '' : '1');
      } else {
        setStep('qty');
        setSelectedVariantId(product.variants[0]?.id || '');
        setCustomQty(product.isLoose ? '' : '1');
      }
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
  const getUnitPrice = (v: any) => product.isLoose ? v.price / (Number(v.baseQty) || 1) : v.price;
  const unitLabel = selectedVariant?.baseUnit || 'pcs';
  const isWeight = ['kg', 'g', 'l', 'ml'].includes(unitLabel.toLowerCase());

  const handleConfirm = () => {
    const qty = Number(customQty);
    if (qty <= 0 || isNaN(qty)) return alert("Enter valid quantity");
    onConfirm(product, selectedVariantId, qty);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-box" style={{ borderRadius: '20px 20px 0 0', maxWidth: '400px', width: '100%', background: 'white' }}>
        <div style={{ background: 'var(--primary)', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px 20px 0 0' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{product.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        
        <div style={{ padding: '20px', background: '#F8FBFF' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Option</h4>
          
          {step === 'variant' && (
            <div className="step-grid">
              {product.variants.map(v => {
                const stockVal = product.isLoose ? Number(v.stock) * (Number(v.baseQty) || 1) : v.stock;
                return (
                  <button key={v.id} className="btn-step" onClick={() => { setSelectedVariantId(v.id); setStep('qty'); }}>
                    <div>
                      <span>{v.quantity}</span>
                      <span className="btn-step-sub">Avail: {stockVal} {v.baseUnit || 'pcs'}</span>
                    </div>
                    <span style={{ color: 'var(--success)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatCurrency(getUnitPrice(v))}/{v.baseUnit || 'pcs'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'qty' && selectedVariant && (
            <>
              <div style={{ background: '#FFFFFF', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed var(--border)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Rate:</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(getUnitPrice(selectedVariant))} / {unitLabel}</span>
                </div>
                
                <div className="preset-grid">
                  {product.isLoose && isWeight ? (
                    [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10].map(val => (
                      <button key={val} className={`btn-preset ${customQty === String(val) ? 'active' : ''}`} onClick={() => setCustomQty(String(val))}>
                        {val < 1 ? val * 1000 + (unitLabel.toLowerCase() === 'kg' ? 'g' : 'ml') : val + ' ' + unitLabel}
                      </button>
                    ))
                  ) : (
                    [1, 2, 3, 4, 5, 6, 10, 12].map(val => (
                      <button key={val} className={`btn-preset ${customQty === String(val) ? 'active' : ''}`} onClick={() => setCustomQty(String(val))}>
                        {val}
                      </button>
                    ))
                  )}
                </div>

                <div style={{ marginTop: '15px', position: 'relative' }}>
                  <input type="number" value={customQty} onChange={e => setCustomQty(e.target.value)} style={{ width: '100%', padding: '14px', fontSize: '20px', fontWeight: 800, textAlign: 'center', color: 'var(--primary)', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', boxSizing: 'border-box' }} placeholder=" " />
                  <label style={{ position: 'absolute', top: '14px', left: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', pointerEvents: 'none' }}>Quantity</label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 5px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>Total:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '24px', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(getUnitPrice(selectedVariant) * (Number(customQty) || 0))}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {product.variants.length > 1 && (
                  <button onClick={() => setStep('variant')} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Back</button>
                )}
                <button onClick={handleConfirm} style={{ flex: product.variants.length > 1 ? 2 : 1, padding: '15px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)' }}>
                  <i className="fa-solid fa-cart-plus"></i> Add to Bill
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};