// File: src/pages/merchant/Inventory.tsx

import React, { useState, useMemo, useRef } from 'react';
import { useDataStore } from '../../store/useDataStore';
import type { Product } from '../../types';
import * as XLSX from 'xlsx';
import ProductForm from '../../components/inventory/ProductForm';

export const Inventory: React.FC = () => {
  const products = useDataStore((state) => state.products);
  const sales = useDataStore((state) => state.sales);
  const bulkUpdateProducts = useDataStore((state) => state.bulkUpdateProducts);
  const bulkDeleteProducts = useDataStore((state) => state.bulkDeleteProducts);

  // --- FILTER STATE ---
  const [activeTier, setActiveTier] = useState<string>('ALL');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeBatch, setActiveBatch] = useState<string>('');
  const [activeBrand, setActiveBrand] = useState<string>('');
  const [activeTax, setActiveTax] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [filterNewest, setFilterNewest] = useState(false);

  // --- MODAL & VIEW STATE ---
  const [showAddForm, setShowAddForm] = useState(false); 
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // --- BULK ACTION STATE ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOp, setBulkOp] = useState<string>('');
  const [bulkVal, setBulkVal] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ════════════════════════════════════════════════════════════
  // 1. ABC TIER ENGINE
  // ════════════════════════════════════════════════════════════
  const getTier = useMemo(() => {
    const freqs: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        freqs[item.variantId] = (freqs[item.variantId] || 0) + item.qty;
      });
    });
    return (variantId: string) => {
      const f = freqs[variantId] || 0;
      if (f > 20) return 'A';
      if (f > 5) return 'B';
      return 'C';
    };
  }, [sales]);

  // ════════════════════════════════════════════════════════════
  // 2. DYNAMIC DATALISTS
  // ════════════════════════════════════════════════════════════
  const uniqueCats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const uniqueBatches = Array.from(new Set(products.map(p => p.batchId).filter(Boolean)));
  const uniqueBrands = Array.from(new Set(products.flatMap(p => p.variants.map(v => v.brandName)).filter(Boolean)));
  const uniqueTaxes = Array.from(new Set(products.map(p => p.gstRate).filter(Boolean)));

  // ════════════════════════════════════════════════════════════
  // 3. FILTERING ENGINE
  // ════════════════════════════════════════════════════════════
  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeTier !== 'ALL') {
      result = result.filter(p => p.variants.some(v => getTier(v.id) === activeTier));
    }
    if (activeCategory) result = result.filter(p => p.category?.toLowerCase() === activeCategory.toLowerCase());
    if (activeBatch) result = result.filter(p => p.batchId === activeBatch);
    if (activeBrand) result = result.filter(p => p.variants.some(v => v.brandName === activeBrand));
    if (activeTax) result = result.filter(p => String(p.gstRate) === activeTax);

    if (filterLowStock) {
      result = result.filter(p => {
        const threshold = Number(p.reorderPoint) || 5;
        const total = p.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
        return total <= threshold;
      });
    }

    if (filterExpiring) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      result = result.filter(p => p.variants.some(v => v.expiryDate && new Date(v.expiryDate) < nextMonth));
    }

    if (filterNewest) {
      result = [...result].sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.variants.some(v => v.barcode?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [products, activeTier, activeCategory, activeBatch, activeBrand, activeTax, filterLowStock, filterExpiring, filterNewest, searchQuery, getTier]);

  // ════════════════════════════════════════════════════════════
  // 4. BULK ACTIONS & EXCEL SYNC
  // ════════════════════════════════════════════════════════════
  const toggleBulkItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApplyBulk = async () => {
    if (selectedIds.size === 0) return;
    if (bulkOp !== 'delete' && !bulkVal) return alert("Please enter a value for the bulk operation.");
    if (!window.confirm(`Are you sure you want to modify ${selectedIds.size} products?`)) return;

    if (bulkOp === 'delete') {
      await bulkDeleteProducts(Array.from(selectedIds));
    } else {
      const modified: Product[] = [];
      products.forEach(p => {
        if (selectedIds.has(p.id)) {
          const updated = { ...p };
          if (bulkOp === 'category') updated.category = bulkVal;
          if (bulkOp === 'tax') updated.gstRate = Number(bulkVal);
          if (bulkOp === 'discount') {
            const pct = Number(bulkVal) || 0;
            updated.variants = updated.variants.map(v => ({ ...v, price: Number((v.price * (1 - pct / 100)).toFixed(2)) }));
          }
          modified.push(updated);
        }
      });
      await bulkUpdateProducts(modified);
    }

    setSelectedIds(new Set());
    setBulkOp('');
    setBulkVal('');
    alert("✨ Bulk Action Applied Successfully");
  };

  const handleExportCSV = () => {
    if (products.length === 0) return alert("No products to export");
    const flattened: any[] = [];
    products.forEach(p => {
      p.variants.forEach(v => {
        flattened.push({
          ProductID: p.id,
          Name: p.name, Category: p.category,
          Type: v.type || '', Brand: v.brandName || '',
          Price: v.price, Stock: v.stock,
          BaseQty: v.baseQty, BaseUnit: v.baseUnit,
          Barcode: v.barcode, Expiry: v.expiryDate, CostPrice: v.costPrice,
          BatchID: p.batchId, HSN: p.hsn, GST: p.gstRate, DateAdded: p.dateAdded
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(flattened);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `BharatPOS_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const groups: Record<string, Product> = {};

        jsonData.forEach((row: any) => {
          const name = row['Name'] || row['Product Name'] || row['Item'];
          if (!name) return;

          const groupId = row['ProductID'] || `${name}_${row['Category'] || 'General'}`;

          if (!groups[groupId]) {
            groups[groupId] = {
              id: row['ProductID'] || `imp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              name: String(name),
              category: String(row['Category'] || 'General'),
              hsn: String(row['HSN'] || ''),
              gstRate: row['GST'] ? Number(row['GST']) : '',
              batchId: String(row['BatchID'] || ''),
              reorderPoint: Number(row['Reorder Point'] || row['Min Stock']) || 5,
              isLoose: String(row['Loose'] || '').toLowerCase() === 'true',
              dateAdded: String(row['DateAdded'] || new Date().toISOString()),
              variants: []
            };
          }

          const typeName = String(row['Type'] || row['Unit'] || 'General');
          const brandName = String(row['Brand'] || '');
          const finalQuantity = brandName ? `${typeName} - ${brandName}` : typeName;

          groups[groupId].variants.push({
            id: `${groups[groupId].id}_v${groups[groupId].variants.length}`,
            type: typeName,
            brandName: brandName,
            quantity: finalQuantity,
            price: Number(row['Price'] || row['Sell Price'] || row['Rate'] || 0),
            stock: Number(row['Stock'] || row['Qty'] || 0),
            barcode: String(row['Barcode'] || ''),
            costPrice: Number(row['CostPrice'] || row['Cost']) || '',
            expiryDate: String(row['Expiry'] || ''),
            baseQty: Number(row['BaseQty']) || 1,
            baseUnit: String(row['BaseUnit'] || 'pcs')
          });
        });

        await bulkUpdateProducts(Object.values(groups));
        alert(`✅ Imported ${Object.keys(groups).length} grouped products successfully!`);
      } catch (err) {
        alert("Import failed. Check file format.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // ════════════════════════════════════════════════════════════
  // RENDER UI
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      
      {showAddForm ? (
        <div className="fade-in">
          <button 
            className="btn btn-outline" 
            onClick={() => setShowAddForm(false)} 
            style={{ marginBottom: '20px', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Inventory
          </button>
          <ProductForm /> 
        </div>
      ) : (
        <>
          {/* HEADER & CONTROLS */}
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1.5px solid var(--border)', paddingBottom: '16px' }}>
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '18px', fontWeight: 800 }}>
              <div className="panel-title-icon teal" style={{ background: 'var(--success-soft)', color: 'var(--success)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-list-check"></i>
              </div>
              Inventory Master
            </h2>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 700, background: 'var(--primary)', color: 'white', border: 'none' }}>
                <i className="fa-solid fa-plus"></i> Add Item
              </button>
              <button className="btn btn-outline" onClick={handleExportCSV} style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 700 }}>
                <i className="fa-solid fa-file-export"></i> Export
              </button>
              <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: 700 }}>
                <i className="fa-solid fa-file-import"></i> Import
              </button>
              <input type="file" ref={fileInputRef} accept=".xlsx, .csv" style={{ display: 'none' }} onChange={handleImportCSV} />
            </div>
          </div>

          {/* SEARCH & FILTER TOGGLE */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div className="search-box-wide" style={{ position: 'relative', flex: 1 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
              <input 
                type="text" placeholder="Search SKU, barcode..." 
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none', fontWeight: 600 }}
              />
            </div>
            <button className="btn btn-outline" onClick={() => setShowFilters(!showFilters)} style={{ padding: '12px 16px', borderRadius: '8px' }}>
              <i className="fa-solid fa-filter"></i> Filters
            </button>
          </div>

          {/* ADVANCED FILTERS SECTION */}
          {showFilters && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
              
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
                {['ALL', 'A', 'B', 'C'].map(tier => (
                  <button key={tier} onClick={() => setActiveTier(tier)} style={{ padding: '6px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '12px', border: 'none', background: activeTier === tier ? 'var(--primary)' : 'transparent', color: activeTier === tier ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}>
                    {tier === 'ALL' ? 'ALL TIERS' : `Tier ${tier}`} {tier === 'A' && '🔥'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <select className="form-select" value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {uniqueCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="form-select" value={activeBatch} onChange={e => setActiveBatch(e.target.value)}>
                  <option value="">All Batches</option>
                  {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select className="form-select" value={activeBrand} onChange={e => setActiveBrand(e.target.value)}>
                  <option value="">All Brands</option>
                  {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select className="form-select" value={activeTax} onChange={e => setActiveTax(e.target.value)}>
                  <option value="">All Taxes (GST)</option>
                  {uniqueTaxes.map(t => <option key={t} value={String(t)}>GST {t}%</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className={`action-chip ${filterLowStock ? 'active' : ''}`} onClick={() => setFilterLowStock(!filterLowStock)} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${filterLowStock ? 'var(--primary)' : 'var(--border)'}`, background: filterLowStock ? 'var(--blue-50)' : 'white', color: filterLowStock ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Low Stock</button>
                <button className={`action-chip ${filterExpiring ? 'active' : ''}`} onClick={() => setFilterExpiring(!filterExpiring)} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${filterExpiring ? 'var(--primary)' : 'var(--border)'}`, background: filterExpiring ? 'var(--blue-50)' : 'white', color: filterExpiring ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Expiring Soon</button>
                <button className={`action-chip ${filterNewest ? 'active' : ''}`} onClick={() => setFilterNewest(!filterNewest)} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${filterNewest ? 'var(--primary)' : 'var(--border)'}`, background: filterNewest ? 'var(--blue-50)' : 'white', color: filterNewest ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>Newest Added</button>
              </div>
            </div>
          )}

          {/* INVENTORY GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', paddingBottom: '100px' }}>
            {filteredProducts.map(p => {
              const vFirst = p.variants[0];
              if (!vFirst) return null;
              
              const totalStock = p.variants.reduce((sum, v) => sum + Number(v.stock), 0);
              const threshold = Number(p.reorderPoint) || 5;
              const isLow = totalStock <= threshold;
              const tier = getTier(vFirst.id);
              
              let basePrice = vFirst.price;
              if (p.isLoose) basePrice = basePrice / (Number(vFirst.baseQty) || 1);

              return (
                <div key={p.id} onClick={() => setDetailProduct(p)} style={{ background: 'white', border: `1.5px solid ${selectedIds.has(p.id) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '12px', padding: '16px', position: 'relative', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: '0.2s' }}>
                  
                  <div style={{ position: 'absolute', top: '12px', right: '12px', width: '24px', height: '24px', borderRadius: '50%', background: tier === 'A' ? 'var(--success)' : tier === 'B' ? 'var(--warning)' : 'var(--slate-400)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                    {tier}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px', paddingRight: '30px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(p.id)} 
                      onChange={(e) => { e.stopPropagation(); toggleBulkItem(p.id); }} 
                      style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }} 
                    />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>{p.name}</h3>
                      <div style={{ display: 'inline-block', marginTop: '6px', fontSize: '10px', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', background: 'var(--blue-50)', padding: '3px 8px', borderRadius: '6px' }}>
                        {p.category || 'General'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>
                        <i className="fa-solid fa-tag"></i> {p.variants.length > 1 ? `${p.variants.length} Variations` : vFirst.quantity}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 800, color: 'var(--success)' }}>
                      ₹{basePrice.toFixed(2)}{p.variants.length > 1 && <span style={{ fontSize: '10px', opacity: 0.6 }}> +</span>}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: isLow ? 'var(--danger)' : 'var(--text-main)', background: isLow ? 'var(--danger-soft)' : 'white', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${isLow ? 'rgba(220,38,38,0.2)' : 'var(--border)'}` }}>
                      <i className={`fa-solid ${isLow ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i> {totalStock}
                    </div>
                  </div>

                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-box-open" style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }}></i>
                <div style={{ fontWeight: 800 }}>No SKUs found.</div>
              </div>
            )}
          </div>

          {/* BULK ACTION BAR (Floating Bottom) */}
          {selectedIds.size > 0 && (
            <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#0F172A', padding: '14px 24px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}><span style={{ color: '#60A5FA' }}>{selectedIds.size}</span> selected</div>
              
              <select value={bulkOp} onChange={e => setBulkOp(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '6px', outline: 'none', fontWeight: 600 }}>
                <option value="" style={{ color: 'black' }}>Select Action...</option>
                <option value="category" style={{ color: 'black' }}>Change Category</option>
                <option value="tax" style={{ color: 'black' }}>Update GST %</option>
                <option value="discount" style={{ color: 'black' }}>Apply Discount %</option>
                <option value="delete" style={{ color: 'black' }}>Delete Items</option>
              </select>

              {['category', 'tax', 'discount'].includes(bulkOp) && (
                 <input type="text" value={bulkVal} onChange={e => setBulkVal(e.target.value)} placeholder="Enter value..." style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '6px', outline: 'none', width: '100px', fontWeight: 600 }} />
              )}

              <button onClick={handleApplyBulk} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Apply</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            </div>
          )}

          {/* PRODUCT DETAILS MODAL */}
          {detailProduct && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '16px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{detailProduct.name}</h3>
                  <button onClick={() => setDetailProduct(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>
                
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                   <span style={{ background: 'var(--success)', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>  Tier {getTier(detailProduct.variants[0]?.id || '')}</span>
                    <span style={{ background: 'var(--blue-100)', color: 'var(--primary-dark)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>{detailProduct.category || 'General'}</span>
                  </div>

                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Global Details</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, borderBottom: '1px dashed var(--border)', paddingBottom: '6px', marginBottom: '6px' }}><span>Batch ID:</span><span>{detailProduct.batchId || '-'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, borderBottom: '1px dashed var(--border)', paddingBottom: '6px', marginBottom: '6px' }}><span>GST Rate:</span><span>{detailProduct.gstRate ? `${detailProduct.gstRate}%` : '-'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}><span>Min Threshold:</span><span>{detailProduct.reorderPoint} Units</span></div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>Types & Variations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detailProduct.variants.map(v => (
                      <div key={v.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>{v.quantity}</div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--success)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: '16px' }}>₹{v.price}</div>
                            <div style={{ fontSize: '11px', color: v.stock <= (Number(detailProduct.reorderPoint) || 5) ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>Stock: {v.stock}</div>
                          </div>
                        </div>
                        {(v.barcode || v.costPrice || v.expiryDate) && (
                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            {v.barcode && <span><i className="fa-solid fa-barcode"></i> {v.barcode}</span>}
                            {v.costPrice && <span><i className="fa-solid fa-tags"></i> Cost: ₹{v.costPrice}</span>}
                            {v.expiryDate && <span><i className="fa-regular fa-calendar-xmark"></i> Exp: {v.expiryDate}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  ); 
};
 
export default Inventory;