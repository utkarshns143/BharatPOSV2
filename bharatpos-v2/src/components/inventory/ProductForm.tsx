import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { Product, ProductVariant } from '../../types';

interface ProductFormProps {
  initialData?: Product | null;
  onSave: (product: Omit<Product, 'id'> | Product) => void;
  onCancel?: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, onSave, onCancel }) => {
  // Config Settings (from the gear icon)
  const [cfgAdvFields, setCfgAdvFields] = useState(false);
  const [cfgLoose, setCfgLoose] = useState(false);
  const [cfgBatch, setCfgBatch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [reorderPoint, setReorderPoint] = useState<number>(5);
  const [batchId, setBatchId] = useState('');
  
  // GST Details
  const [showGst, setShowGst] = useState(false);
  const [hsn, setHsn] = useState('');
  const [gstRate, setGstRate] = useState<number | ''>('');
  const [priceType, setPriceType] = useState<'inclusive' | 'exclusive'>('inclusive');

  // Scanner UI State
  const [isScanning, setIsScanning] = useState(false);

  // Variant Engine
  const [variants, setVariants] = useState<Omit<ProductVariant, 'id'>[]>([
    { quantity: '1 pc', price: 0, stock: 0 }
  ]);

  // Auto-fill form if editing an existing product
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setVariants(initialData.variants);
      setIsLoose(initialData.isLoose);
      setReorderPoint(initialData.reorderPoint);
      setHsn(initialData.hsn || '');
      setGstRate(initialData.gstRate || '');
      setPriceType(initialData.priceType || 'inclusive');
      setBatchId(initialData.batchId || '');
      
      if (initialData.hsn || initialData.gstRate) setShowGst(true);
      if (initialData.batchId || initialData.reorderPoint !== 5) {
        setShowSettings(true);
        setCfgAdvFields(true);
      }
    }
  }, [initialData]);

  // Toggles Loose from internal state since it maps to cfgLoose visually
  const setIsLoose = (val: boolean) => setCfgLoose(val);

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || variants.some(v => !v.quantity || v.price <= 0)) {
      alert("Please fill in the product name and ensure all variants have a price.");
      return;
    }

    onSave({
      ...(initialData ? { id: initialData.id } : {}), // Keep ID if editing
      name,
      category: category || 'Uncategorized',
      variants: variants as ProductVariant[],
      isLoose: cfgLoose,
      reorderPoint,
      hsn,
      gstRate: gstRate ? Number(gstRate) : undefined,
      priceType,
      batchId
    } as Product | Omit<Product, 'id'>);

    if (!initialData) {
      // Reset Form only if adding new
      setName(''); setCategory(''); setBatchId(''); setHsn(''); setGstRate('');
      setVariants([{ quantity: '1 pc', price: 0, stock: 0 }]);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none' };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', boxSizing: 'border-box' }}>
      <Card padding="1.5rem" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', boxSizing: 'border-box' }}>
        
        {/* Header Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
            <span style={{ backgroundColor: '#eff6ff', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>📦</span>
            {initialData ? 'Edit Product' : 'Product Engine'}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsScanning(!isScanning)} style={{ color: 'var(--primary)', borderColor: 'var(--primary)', padding: '0.5rem 0.75rem' }}>
              📷 Lens
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowSettings(!showSettings)} style={{ padding: '0.5rem 0.75rem' }}>
              ⚙️ Settings
            </Button>
          </div>
        </div>

        {isScanning && (
          <div style={{ backgroundColor: '#0F172A', borderRadius: 'var(--radius)', border: '3px solid var(--primary)', padding: '1rem', textAlign: 'center', color: 'white' }}>
            <div style={{ height: '200px', backgroundColor: 'black', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
              [Camera Preview / QuaggaJS mounts here]
            </div>
            <Button type="button" variant="danger" onClick={() => setIsScanning(false)}>Stop Lens</Button>
          </div>
        )}

        {showSettings && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Form Configuration</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                Enable Advanced Fields (Alerts, HSN)
                <input type="checkbox" checked={cfgAdvFields} onChange={e => setCfgAdvFields(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}/>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                Enable Sell By Weight (Loose)
                <input type="checkbox" checked={cfgLoose} onChange={e => setCfgLoose(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}/>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                Enable Batch System (Lot No.)
                <input type="checkbox" checked={cfgBatch} onChange={e => setCfgBatch(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}/>
              </label>
            </div>
          </div>
        )}
        
        {/* Core Inputs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Product Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} list="catList" />
            <datalist id="catList"><option value="Groceries"/><option value="Dairy"/><option value="Snacks"/></datalist>
          </div>
        </div>

        {/* Variant Engine */}
        <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxSizing: 'border-box' }}>
          {variants.map((variant, index) => (
            <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1rem', backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxSizing: 'border-box' }}>
              <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Size / Type</label>
                <input type="text" value={variant.quantity} onChange={e => handleVariantChange(index, 'quantity', e.target.value)} required style={inputStyle} placeholder="1 kg / Red" />
              </div>
              <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--success)' }}>Price (₹)</label>
                <input type="number" value={variant.price || ''} onChange={e => handleVariantChange(index, 'price', Number(e.target.value))} required min="0" style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 80px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Stock</label>
                <input type="number" value={variant.stock || ''} onChange={e => handleVariantChange(index, 'stock', Number(e.target.value))} required min="0" style={inputStyle} />
              </div>
              {variants.length > 1 && (
                <button type="button" onClick={() => handleRemoveVariant(index)} style={{ padding: '0.75rem', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', height: '42px', flex: '0 0 auto' }}>✕</button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setVariants([...variants, { quantity: '', price: 0, stock: 0 }])} style={{ width: '100%', borderStyle: 'dashed', color: 'var(--primary)' }}>
            ➕ Add Type (Color/Size/Wt)
          </Button>
        </div>

        {/* GST Configuration */}
        <div style={{ width: '100%' }}>
          <button type="button" onClick={() => setShowGst(!showGst)} style={{ width: '100%', backgroundColor: '#fffbeb', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box' }}>
            <span style={{ color: 'var(--warning)' }}>🧾 Level 2 — GST Config</span>
            <span>{showGst ? '▲' : '▼'}</span>
          </button>
          
          {showGst && (
            <div style={{ padding: '1rem', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)', backgroundColor: 'white', display: 'flex', flexWrap: 'wrap', gap: '1rem', boxSizing: 'border-box' }}>
              <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>HSN Code</label>
                <input type="text" value={hsn} onChange={e => setHsn(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 80px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>GST %</label>
                <input type="number" value={gstRate} onChange={e => setGstRate(e.target.value ? Number(e.target.value) : '')} style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>Tax Calc</label>
                <select value={priceType} onChange={e => setPriceType(e.target.value as any)} style={inputStyle}>
                  <option value="inclusive">Inclusive</option>
                  <option value="exclusive">Exclusive</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Conditional Advanced Fields */}
        {(cfgAdvFields || cfgBatch) && (
          <div style={{ borderTop: '1.5px dashed var(--border)', paddingTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {cfgBatch && (
              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Batch ID (Lot No.)</label>
                <input type="text" value={batchId} onChange={e => setBatchId(e.target.value)} style={inputStyle} />
              </div>
            )}
            {cfgAdvFields && (
              <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Min. Stock Alert Threshold</label>
                <input type="number" value={reorderPoint} onChange={e => setReorderPoint(Number(e.target.value))} style={inputStyle} />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} style={{ flex: 1, padding: '1rem', boxSizing: 'border-box' }}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', boxSizing: 'border-box' }}>
            {initialData ? 'Update Product' : 'Save to Database'}
          </Button>
        </div>

      </Card>
    </form>
  );
};