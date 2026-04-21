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
  const [cfgAdvFields, setCfgAdvFields] = useState(false);
  const [cfgLoose, setCfgLoose] = useState(false);
  const [cfgBatch, setCfgBatch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState(''); // NEW: Advanced Categorization
  const [reorderPoint, setReorderPoint] = useState<number>(5);
  const [batchId, setBatchId] = useState('');
  
  const [showGst, setShowGst] = useState(false);
  const [hsn, setHsn] = useState('');
  const [gstRate, setGstRate] = useState<number | ''>('');
  const [priceType, setPriceType] = useState<'inclusive' | 'exclusive'>('inclusive');

  const [variants, setVariants] = useState<Omit<ProductVariant, 'id'>[]>([
    { quantity: '', price: 0, stock: 0 }
  ]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      
      // Split category if it has a sub-category (e.g., "Grocery > Dal")
      if (initialData.category.includes(' > ')) {
        const parts = initialData.category.split(' > ');
        setCategory(parts[0]);
        setSubCategory(parts[1]);
      } else {
        setCategory(initialData.category);
      }
      
      setVariants(initialData.variants);
      setCfgLoose(initialData.isLoose || false);
      setReorderPoint(initialData.reorderPoint || 5);
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

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || variants.some(v => !v.quantity || v.price <= 0)) {
      alert("Please fill in the product name and ensure all variants have a name/quantity and price.");
      return;
    }

    const finalCategory = subCategory ? `${category.trim()} > ${subCategory.trim()}` : category.trim() || 'Uncategorized';

    onSave({
      ...(initialData ? { id: initialData.id } : {}),
      name,
      category: finalCategory,
      variants: variants as ProductVariant[],
      isLoose: cfgLoose,
      reorderPoint,
      hsn,
      gstRate: gstRate ? Number(gstRate) : undefined,
      priceType,
      batchId
    } as Product | Omit<Product, 'id'>);
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none' };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', boxSizing: 'border-box' }}>
      <Card padding="1.5rem" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
            <span style={{ backgroundColor: '#eff6ff', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>📦</span>
            {initialData ? 'Edit Product' : 'Product Engine'}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setShowSettings(!showSettings)} style={{ padding: '0.5rem 0.75rem' }}>
              ⚙️ Config
            </Button>
          </div>
        </div>

        {showSettings && (
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                Enable Sell By Weight (Fractional Qty)
                <input type="checkbox" checked={cfgLoose} onChange={e => setCfgLoose(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}/>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                Enable Advanced Fields (Alerts)
                <input type="checkbox" checked={cfgAdvFields} onChange={e => setCfgAdvFields(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}/>
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
          <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Product Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="e.g. Aashirvaad Atta" />
          </div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Main Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} list="catList" placeholder="e.g. Grocery" />
            <datalist id="catList"><option value="Grocery"/><option value="Dairy"/><option value="Snacks"/></datalist>
          </div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sub-Category (Optional)</label>
            <input type="text" value={subCategory} onChange={e => setSubCategory(e.target.value)} style={inputStyle} placeholder="e.g. Flours & Grains" />
          </div>
        </div>

        {/* Variant Engine */}
        <div style={{ backgroundColor: cfgLoose ? '#fdf4ff' : '#f9f9f9', padding: '1rem', borderRadius: 'var(--radius)', border: cfgLoose ? '1px solid #e879f9' : '1px solid var(--border)', boxSizing: 'border-box' }}>
          
          {cfgLoose && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fae8ff', color: '#86198f', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
              ⚖️ <b>Sell By Weight Mode:</b> Define your "Base Unit" (e.g. 1 Kg). Enter the price per Base Unit. Enter total stock in Base Units.
            </div>
          )}

          {variants.map((variant, index) => (
            <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1rem', backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxSizing: 'border-box' }}>
              <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: cfgLoose ? '#a21caf' : 'var(--text-muted)' }}>
                  {cfgLoose ? 'Base Unit (e.g. 1 Kg)' : 'Size / Pack Type'}
                </label>
                <input type="text" value={variant.quantity} onChange={e => handleVariantChange(index, 'quantity', e.target.value)} required style={inputStyle} placeholder={cfgLoose ? "1 Kg" : "500g Pack"} />
              </div>
              <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  {cfgLoose ? 'Price per Base Unit (₹)' : 'Price (₹)'}
                </label>
                <input type="number" value={variant.price || ''} onChange={e => handleVariantChange(index, 'price', Number(e.target.value))} required min="0" style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 80px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                  {cfgLoose ? 'Total Stock (Base Units)' : 'Stock Count'}
                </label>
                <input type="number" value={variant.stock || ''} onChange={e => handleVariantChange(index, 'stock', Number(e.target.value))} required min="0" step={cfgLoose ? "0.01" : "1"} style={inputStyle} />
              </div>
              {variants.length > 1 && (
                <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== index))} style={{ padding: '0.75rem', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', height: '42px', flex: '0 0 auto' }}>✕</button>
              )}
            </div>
          ))}
          {!cfgLoose && (
            <Button type="button" variant="outline" onClick={() => setVariants([...variants, { quantity: '', price: 0, stock: 0 }])} style={{ width: '100%', borderStyle: 'dashed', color: 'var(--primary)' }}>
              ➕ Add Size / Variant
            </Button>
          )}
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