import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import type { Product } from '../../types';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ isOpen, onClose, product, onEdit, onDelete }) => {
  if (!isOpen || !product) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      <Card padding="0" style={{ width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: 'white', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>{product.name}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{product.category}</span>
              {product.isLoose && <span style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>LOOSE</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc' }}>
          
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Accounting & Tax</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>HSN Code:</span>
              <span style={{ fontWeight: 'bold' }}>{product.hsn || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>GST Rate:</span>
              <span style={{ fontWeight: 'bold' }}>{product.gstRate ? `${product.gstRate}%` : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tax Type:</span>
              <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{product.priceType || '-'}</span>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Global Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Batch ID:</span>
              <span style={{ fontWeight: 'bold' }}>{product.batchId || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Alert Threshold:</span>
              <span style={{ fontWeight: 'bold' }}>{product.reorderPoint} units</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Variants & Stock</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {product.variants.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 'bold' }}>{v.quantity}</div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold', fontFamily: 'monospace' }}>{formatCurrency(v.price)}</span>
                    <span style={{ backgroundColor: v.stock <= product.reorderPoint ? '#fee2e2' : '#f1f5f9', color: v.stock <= product.reorderPoint ? 'var(--danger)' : 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {v.stock} in stock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="outline" style={{ flex: 1, borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={() => onEdit(product)}>
              ✏️ Edit
            </Button>
            <Button variant="outline" style={{ flex: 1, borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => onDelete(product)}>
              🗑️ Delete
            </Button>
          </div>

        </div>
      </Card>
    </div>
  );
};