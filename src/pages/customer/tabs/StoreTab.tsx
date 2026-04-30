import React, { useState, useEffect, useMemo } from 'react';
import { useCustomerStore } from '../../../store/useCustomerStore';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Product } from '../../../types';

interface StoreTabProps {
  isActive: boolean;
  onOrderPlaced: () => void;
}

export const StoreTab: React.FC<StoreTabProps> = ({ isActive, onOrderPlaced }) => {
  const { phone, activeShopId } = useCustomerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCat, setActiveCat] = useState('ALL');
  
  const [cart, setCart] = useState<Record<string, any>>({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizProd, setWizProd] = useState<Product | null>(null);
  const [wizVariant, setWizVariant] = useState<any | null>(null);
  const [wizQty, setWizQty] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (isActive && activeShopId && activeShopId !== 'ALL') {
        try {
          const prodSnap = await getDocs(collection(db, "shops", activeShopId, "products"));
          const pList: Product[] = [];
          prodSnap.forEach(d => pList.push({ id: d.id, ...d.data() } as Product));
          setProducts(pList);
        } catch (error) {
          console.error("Failed to load products", error);
        }
      }
    };
    fetchProducts();
  }, [isActive, activeShopId]);

  // Safely grab categories
  const uniqueCats = useMemo(() => Array.from(new Set(products?.map(p => p.category).filter(Boolean) || [])), [products]);
  
  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      const matchCat = activeCat === 'ALL' || p.category === activeCat;
      const matchName = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchName;
    });
  }, [products, activeCat, searchQuery]);

  const cartTotal = Object.values(cart).reduce((sum, i) => sum + ((i.price || 0) * (i.qty || 0)), 0);
  const cartItemCount = Object.values(cart).reduce((sum, i) => sum + (i.qty || 0), 0);

  const openWizard = (prod: Product) => {
    setWizProd(prod);
    setWizVariant(prod.variants?.[0] || null);
    setWizQty(1);
    setIsWizardOpen(true);
  };

  const handleAddToCart = (prod: Product, variant: any, qty: number) => {
    if (!variant) return;
    const key = `${prod.id}_${variant.id}`;
    let price = variant.price || 0;
    if (prod.isLoose) price = price / (Number(variant.baseQty) || 1);

    setCart(prev => ({
      ...prev,
      [key]: prev[key] ? { ...prev[key], qty: prev[key].qty + qty } : {
        prodId: prod.id, variantId: variant.id, name: prod.name,
        variantName: variant.quantity, price, qty
      }
    }));
    setIsWizardOpen(false);
  };

  const handleCustomService = () => {
    const name = prompt("Enter the service you need (e.g., Fan Repair):");
    if (!name) return;
    const id = `srv_${Date.now()}`;
    setCart(prev => ({ ...prev, [id]: { prodId: id, variantId: 'custom', name: `Service: ${name}`, variantName: '', price: 0, qty: 1, isService: true } }));
  };

  const placeOrder = async () => {
    if (Object.keys(cart).length === 0 || !activeShopId || activeShopId === 'ALL') return;
    setIsLoading(true);

    try {
      const itemsArr = Object.values(cart).map(i => ({ id: i.prodId, name: i.name + (i.variantName ? ` (${i.variantName})` : ''), price: i.price, qty: i.qty }));
      const order = {
        date: new Date().toISOString(), customerMobile: phone, customerName: "Khata App User",
        status: "PENDING", orderType: Object.values(cart).some(i => i.isService) ? "Service Request" : "Home Delivery",
        totalAmount: cartTotal, items: itemsArr
      };

      await addDoc(collection(db, "shops", activeShopId, "onlineOrders"), order);
      alert("Order sent successfully!");
      setCart({});
      onOrderPlaced();
    } catch (e) {
      alert("Failed to send order.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={`tab-view ${isActive ? 'active' : ''}`}>
      {!activeShopId || activeShopId === 'ALL' ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)', fontWeight: 700 }}>Select a specific shop from the top menu to view its catalog.</div>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" className="search-bar" placeholder="Search for items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div className="cat-scroll">
            <div className={`cat-chip ${activeCat === 'ALL' ? 'active' : ''}`} onClick={() => setActiveCat('ALL')}>All Items</div>
            {uniqueCats.map(c => <div key={c} className={`cat-chip ${activeCat === c ? 'active' : ''}`} onClick={() => setActiveCat(c)}>{c}</div>)}
          </div>

          <div className="prod-grid">
            <div className="prod-item" style={{ border: '2px dashed var(--brand-primary)', cursor: 'pointer', background: '#eff6ff' }} onClick={handleCustomService}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Custom Request</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>Request a Service</div>
                <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, marginTop: '4px' }}>Fan Repair, Plumbing, etc.</div>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '8px', textAlign: 'center' }}><i className="fa-solid fa-screwdriver-wrench fa-lg"></i></div>
                <button className="btn-add" style={{ background: 'var(--brand-primary)', color: 'white' }}>Add Request</button>
              </div>
            </div>

            {filteredProducts.map(p => {
              // SAFE FALLBACK: In case product has no variants in DB
              if (!p.variants || p.variants.length === 0) return null;

              const v = p.variants[0];
              const priceStr = p.isLoose ? `₹${(v.price / (Number(v.baseQty) || 1)).toFixed(2)}` : `₹${v.price}`;
              const unitLabel = p.isLoose ? v.baseUnit : (v.quantity || 'pc');

              return (
                <div key={p.id} className="prod-item">
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>{p.category || 'Gen'}</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, marginTop: '4px' }}>{v.quantity}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', fontFamily: "'JetBrains Mono', monospace", marginTop: '8px' }}>{priceStr} <span style={{ fontSize: '10px', color: 'var(--text-sub)' }}>/ {unitLabel}</span></div>
                    <button className="btn-add" onClick={() => { if (p.variants.length > 1) openWizard(p); else handleAddToCart(p, v, 1); }}>{p.variants.length > 1 ? 'Select Options' : '+ Add to Cart'}</button>
                  </div>
                </div>
              );
            })}
          </div>

          {cartItemCount > 0 && (
            <div style={{ position: 'fixed', bottom: '80px', left: '16px', right: '16px', background: 'var(--text-main)', color: 'white', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Your Cart</div>
                <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", marginTop: '2px' }}>{cartItemCount} Items | ₹{cartTotal.toFixed(2)}</div>
              </div>
              <button onClick={placeOrder} disabled={isLoading} style={{ background: 'var(--brand-accent)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }}>
                {isLoading ? 'Sending...' : 'Place Order ➔'}
              </button>
            </div>
          )}
        </>
      )}

      {/* WIZARD MODAL */}
      {isWizardOpen && wizProd && (
        <div className="khata-modal-overlay">
          <div className="khata-modal-box">
            <button className="btn-close" onClick={() => setIsWizardOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>{wizProd.name}</h3>
            
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: '10px' }}>Select Type/Size</div>
            <div className="wizard-step-grid">
              {/* SAFELY MAPPING VARIANTS */}
              {wizProd.variants?.map((v: any) => (
                <button key={v.id} className={`btn-wizard-opt ${wizVariant?.id === v.id ? 'active' : ''}`} onClick={() => setWizVariant(v)}>
                  <div>
                    <span>{v.quantity}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-sub)', display: 'block', marginTop: '4px' }}>Avail: {v.stock}</span>
                  </div>
                  <span style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>₹{v.price}</span>
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <button onClick={() => setWizQty(Math.max(1, wizQty - 1))} style={{ width: '40px', height: '40px', borderRadius: '20px', border: 'none', background: '#e2e8f0', fontSize: '20px', fontWeight: 800, cursor: 'pointer' }}>-</button>
                <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{wizQty}</div>
                <button onClick={() => setWizQty(wizQty + 1)} style={{ width: '40px', height: '40px', borderRadius: '20px', border: 'none', background: '#e0e7ff', color: 'var(--brand-primary)', fontSize: '20px', fontWeight: 800, cursor: 'pointer' }}>+</button>
              </div>
              <button className="btn-main" onClick={() => handleAddToCart(wizProd, wizVariant, wizQty)}><i className="fa-solid fa-cart-plus"></i> Add to Cart</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};