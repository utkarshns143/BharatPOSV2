import React, { useState, useMemo } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { ProductForm } from '../../components/inventory/ProductForm';
import { ProductDetailsModal } from '../../components/inventory/ProductDetailsModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

export const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  const products = useDataStore(state => state.products);
  const setProducts = useDataStore(state => state.setProducts);
  
  // Filter & Search State
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDeepAction, setActiveDeepAction] = useState<string | null>(null);
  
  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOperation, setBulkOperation] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  const handleSaveProduct = (savedProduct: any) => {
    if (activeTab === 'edit' && editingProduct) {
      const updatedList = products.map(p => p.id === editingProduct.id ? { ...savedProduct, id: p.id } : p);
      setProducts(updatedList);
      alert(`${savedProduct.name} updated!`);
    } else {
      const productWithIds = {
        ...savedProduct,
        id: Math.random().toString(36).substring(7),
        variants: savedProduct.variants.map((v: any) => ({ ...v, id: Math.random().toString(36).substring(7) }))
      };
      setProducts([...products, productWithIds]);
      alert(`${savedProduct.name} added!`);
    }
    setActiveTab('list');
    setEditingProduct(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.category.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeDeepAction === 'LowStock') {
        const isLowStock = product.variants.some(v => v.stock <= (product.reorderPoint || 0));
        if (!isLowStock) return false;
      }
      return true;
    });
  }, [products, searchQuery, activeDeepAction]);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleApplyBulk = () => {
    if (selectedIds.size === 0 || !bulkOperation) return;

    if (bulkOperation === 'delete') {
      if (!window.confirm(`Delete ${selectedIds.size} items?`)) return;
      const remainingProducts = products.filter(p => !selectedIds.has(p.id));
      setProducts(remainingProducts);
      setSelectedIds(new Set());
      setBulkOperation('');
      alert('Items deleted successfully.');
    } 
    else if (bulkOperation === 'category') {
      if (!bulkValue.trim()) return alert('Enter a new category name.');
      const updatedProducts = products.map(p => selectedIds.has(p.id) ? { ...p, category: bulkValue } : p);
      setProducts(updatedProducts);
      setSelectedIds(new Set());
      setBulkOperation('');
      setBulkValue('');
      alert('Categories updated successfully.');
    }
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Inventory</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>Manage your catalog & variants</p>
        </div>
        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '0.25rem', borderRadius: 'var(--radius)' }}>
          <button onClick={() => { setActiveTab('list'); setEditingProduct(null); }} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: activeTab === 'list' ? 'white' : 'transparent', color: activeTab === 'list' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: activeTab === 'list' ? 'var(--shadow)' : 'none' }}>List</button>
          <button onClick={() => { setActiveTab('add'); setEditingProduct(null); }} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: activeTab === 'add' ? 'var(--primary)' : 'transparent', color: activeTab === 'add' ? 'white' : 'var(--text-muted)', boxShadow: activeTab === 'add' ? 'var(--shadow)' : 'none' }}>+ Add</button>
        </div>
      </div>

      {(activeTab === 'add' || activeTab === 'edit') ? (
        <ProductForm 
          initialData={activeTab === 'edit' ? editingProduct : null}
          onSave={handleSaveProduct} 
          onCancel={() => { setActiveTab('list'); setEditingProduct(null); }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: selectedIds.size > 0 ? '80px' : '0' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            <Button variant="outline" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem', color: 'var(--primary)' }}>🌐 Global DB</Button>
            <Button variant="outline" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>📤 Export</Button>
            <Button variant="outline" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>📥 Import</Button>
            <Button variant="outline" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>🔄 Sync</Button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="text" placeholder="Search SKU, category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxSizing: 'border-box' }}/>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? 'Hide Filters' : '⚙️ Filters'}
            </Button>
          </div>

          {showFilters && (
            <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveDeepAction(activeDeepAction === 'LowStock' ? null : 'LowStock')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: activeDeepAction === 'LowStock' ? '2px solid var(--danger)' : '1px solid var(--border)', backgroundColor: activeDeepAction === 'LowStock' ? '#fee2e2' : 'white', fontWeight: 'bold', color: 'var(--danger)', cursor: 'pointer' }}>
                  {activeDeepAction === 'LowStock' ? '✓ Low Stock' : 'Low Stock Alert'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
               <input type="checkbox" onChange={toggleSelectAll} checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}/> Select All
             </label>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Showing {filteredProducts.length} items</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredProducts.map(product => {
              const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map(v => v.price)) : 0;
              const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
              const isLowStock = totalStock <= (product.reorderPoint || 0);

              return (
                <Card 
                  key={product.id} 
                  padding="1rem" 
                  style={{ position: 'relative', border: selectedIds.has(product.id) ? '2px solid var(--primary)' : '1px solid var(--border)', boxSizing: 'border-box', cursor: 'pointer' }}
                  onClick={() => setViewingProduct(product)}
                >
                  <input type="checkbox" checked={selectedIds.has(product.id)} onChange={(e) => { e.stopPropagation(); toggleSelectOne(product.id); }} onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '1rem', left: '1rem', width: '20px', height: '20px', accentColor: 'var(--primary)', zIndex: 2, cursor: 'pointer' }}/>
                  
                  <div style={{ paddingLeft: '2.5rem' }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{product.name}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', backgroundColor: '#e0e7ff', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>{product.category}</span>
                      {product.isLoose && <span style={{ fontSize: '0.7rem', backgroundColor: '#f3e8ff', color: 'var(--purple)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>LOOSE</span>}
                      {isLowStock && <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: 'var(--danger)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>LOW STOCK</span>}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'monospace' }}>{formatCurrency(minPrice)}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{totalStock} in stock</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {selectedIds.size > 0 && (
            <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#0F172A', padding: '1rem 1.5rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', width: 'max-content', maxWidth: '90vw', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}><span style={{ color: '#60A5FA' }}>{selectedIds.size}</span> selected</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select value={bulkOperation} onChange={(e) => setBulkOperation(e.target.value)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '8px', outline: 'none' }}>
                  <option value="" style={{ color: 'black' }}>Action...</option>
                  <option value="category" style={{ color: 'black' }}>Change Category</option>
                  <option value="delete" style={{ color: 'black' }}>Delete Items</option>
                </select>
                {bulkOperation === 'category' && <input type="text" placeholder="New Category" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', width: '120px' }}/>}
                <Button variant="primary" onClick={handleApplyBulk} style={{ padding: '0.5rem 1rem' }}>Apply</Button>
              </div>
            </div>
          )}

        </div>
      )}

      <ProductDetailsModal 
        isOpen={!!viewingProduct}
        product={viewingProduct}
        onClose={() => setViewingProduct(null)}
        onEdit={(p) => { setViewingProduct(null); setEditingProduct(p); setActiveTab('edit'); }}
        onDelete={(p) => { if (window.confirm(`Delete ${p.name}?`)) { setProducts(products.filter(item => item.id !== p.id)); setViewingProduct(null); } }}
      />

    </div>
  );
};

export default Inventory;