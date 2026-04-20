import React, { useState, useEffect, useMemo } from 'react';

import { useDataStore } from '../../store/useDataStore';
import { ProductCard } from '../../components/shared/ProductCard';
import { VariantModal } from '../../components/pos/VariantModal';
import { formatCurrency } from '../../utils/formatters';
import type { Product, Sale, CartItem } from '../../types';

export const CustomerPortal: React.FC = () => {
  
  
  // --- "BACKEND" CONNECTION ---
  // In Phase 8, this will fetch directly from Firestore. 
  // For now, we simulate the cloud by reading the global store.
  const allSales = useDataStore(state => state.sales);
  const products = useDataStore(state => state.products);
  const profile = useDataStore(state => state.profile);

  // --- APP STATE ---
  const [phone, setPhone] = useState(localStorage.getItem('customer_phone') || '');
  const [isAuthOpen, setIsAuthOpen] = useState(!phone);
  const [authInput, setAuthInput] = useState('');
  const [activeTab, setActiveTab] = useState<'bills' | 'store' | 'khoj'>('bills');
  const [isLoading, setIsLoading] = useState(false);

  // --- STORE/CART STATE ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  // --- RECEIPT STATE ---
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);

  // --- FETCH CUSTOMER'S DATA ---
  const myBills = useMemo(() => {
    if (!phone) return [];
    // Only fetch bills belonging to this exact phone number
    return allSales
      .filter(s => s.customerId === phone)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allSales, phone]);

  const totalPendingUdhaar = useMemo(() => {
    return myBills.reduce((total, bill) => {
      if (bill.paymentMethod === 'Udhaar') return total + bill.total;
      if (bill.split && bill.split.udhaar > 0) return total + bill.split.udhaar;
      return total;
    }, 0);
  }, [myBills]);

  // --- ACTIONS ---
  const handleLogin = () => {
    if (authInput.length !== 10) return alert("Please enter a valid 10-digit number.");
    setIsLoading(true);
    setTimeout(() => {
      setPhone(authInput);
      localStorage.setItem('customer_phone', authInput);
      setIsAuthOpen(false);
      setIsLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    if (window.confirm("Log out of your Khata?")) {
      localStorage.removeItem('customer_phone');
      setPhone('');
      setAuthInput('');
      setIsAuthOpen(true);
      setCart([]);
    }
  };

  const handleAddToCart = (product: Product, variantId?: string, qty: number = 1) => {
    const targetVariantId = variantId || product.variants[0].id;
    const variant = product.variants.find(v => v.id === targetVariantId) || product.variants[0];

    const existingIndex = cart.findIndex(item => item.prodId === product.id && item.variantId === targetVariantId);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].qty += qty;
      newCart[existingIndex].total = newCart[existingIndex].qty * newCart[existingIndex].price;
      setCart(newCart);
    } else {
      setCart([...cart, {
        prodId: product.id,
        variantId: targetVariantId,
        name: product.name,
        variantName: variant.quantity,
        price: variant.price,
        qty: qty,
        isLoose: product.isLoose,
        total: qty * variant.price
      }]);
    }
  };

  const handlePlaceOrder = () => {
    alert("Order sent to shop successfully! They will contact you shortly.");
    setCart([]);
    setActiveTab('bills');
  };

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    if (activeTab === 'khoj' && profile?.lat && profile?.lng) {
      // Dynamically load Leaflet for the map tab
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        const L = (window as any).L;
        const container = document.getElementById('khojMapContainer');
        if (container && !container.innerHTML) {
          const map = L.map('khojMapContainer').setView([profile.lat, profile.lng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          L.marker([profile.lat, profile.lng]).addTo(map)
            .bindPopup(`<b>${profile.shopName}</b><br>Your Local Store`).openPopup();
        }
      };
      document.body.appendChild(script);
    }
  }, [activeTab, profile]);

  // --- INLINE CSS FOR CUSTOMER THEME ---
  const theme = {
    bg: '#f4f7f6', card: '#ffffff',
    primary: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    textMain: '#1e293b', textSub: '#64748b'
  };

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: '100vh', fontFamily: 'var(--font-body)', color: theme.textMain, paddingBottom: '80px' }}>
      
      {/* HEADER */}
      <header style={{ backgroundColor: theme.card, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, background: theme.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Mera Khata
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '200px', marginLeft: '15px' }}>
          <select style={{ width: '100%', appearance: 'none', background: '#e0e7ff', color: theme.primary, border: '1.5px solid #c7d2fe', padding: '8px 30px 8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 800, outline: 'none' }}>
            <option>{profile?.shopName || 'Connecting to Shop...'}</option>
          </select>
          <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.primary, fontSize: '10px', pointerEvents: 'none' }}></i>
        </div>
        {phone && (
          <button onClick={handleLogout} style={{ background: '#f1f5f9', border: 'none', color: theme.textSub, width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', marginLeft: '10px' }}>
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main style={{ padding: '16px' }}>
        
        {/* TAB: BILLS & UDHAAR */}
        {activeTab === 'bills' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {totalPendingUdhaar > 0 && (
              <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', boxShadow: '0 8px 25px rgba(220,38,38,0.08)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Total Due Amount</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '26px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{formatCurrency(totalPendingUdhaar)}</div>
                </div>
                <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: '36px', color: '#dc2626', opacity: 0.8 }}></i>
              </div>
            )}

            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800 }}>Recent Purchases</h3>
            
            {myBills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textSub }}>
                <i className="fa-solid fa-receipt" style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }}></i>
                <p style={{ fontWeight: 600 }}>No bills found for your number.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myBills.map(bill => (
                  <div key={bill.id} onClick={() => setViewingReceipt(bill)} style={{ background: theme.card, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: theme.textMain }}>{bill.id}</div>
                      <div style={{ fontSize: '11px', color: theme.textSub, fontWeight: 600, marginTop: '2px' }}>{new Date(bill.timestamp).toLocaleDateString()} • {bill.items.length} items</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: bill.paymentMethod === 'Udhaar' || (bill.split && bill.split.udhaar > 0) ? '#dc2626' : '#16a34a' }}>
                        {formatCurrency(bill.total)}
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', background: '#f1f5f9', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>
                        {bill.paymentMethod}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: STORE / ORDER */}
        {activeTab === 'store' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800 }}>Shop Online</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {products.map(p => (
                <ProductCard 
                  key={p.id} product={p} actionLabel="Add"
                  onActionClick={(product) => {
                    if (product.variants.length === 1 && !product.isLoose) handleAddToCart(product);
                    else { setSelectedProduct(product); setIsVariantModalOpen(true); }
                  }}
                />
              ))}
            </div>

            {/* Floating Cart Button */}
            {cart.length > 0 && (
              <div style={{ position: 'fixed', bottom: '80px', left: '16px', right: '16px', background: theme.gradient, color: 'white', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)', zIndex: 100 }}>
                <div style={{ fontWeight: 800 }}>{cart.reduce((sum, i) => sum + i.qty, 0)} Items | {formatCurrency(cart.reduce((sum, i) => sum + i.total, 0))}</div>
                <button onClick={handlePlaceOrder} style={{ background: 'white', color: theme.primary, border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>Send Order <i className="fa-solid fa-paper-plane"></i></button>
              </div>
            )}
          </div>
        )}

        {/* TAB: KHOJ (MAP) */}
        {activeTab === 'khoj' && (
          <div style={{ animation: 'fadeIn 0.3s ease', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800 }}>Store Location</h3>
            {profile?.lat && profile?.lng ? (
              <div id="khojMapContainer" style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: '2px solid #e2e8f0' }}></div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.textSub, background: theme.card, borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                <i className="fa-solid fa-map-location-dot" style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.5 }}></i>
                <p style={{ fontWeight: 600 }}>Shop owner hasn't updated their GPS location yet.</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '12px 10px 24px 10px', zIndex: 1000 }}>
        {[
          { id: 'bills', icon: 'fa-file-invoice-dollar', label: 'Bills' },
          { id: 'store', icon: 'fa-basket-shopping', label: 'Order' },
          { id: 'khoj', icon: 'fa-radar', label: 'Khoj' }
        ].map(tab => (
          <div 
            key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === tab.id ? theme.primary : theme.textSub, fontSize: '11px', fontWeight: 700, width: '33%', cursor: 'pointer' }}
          >
            <i className={`fa-solid ${tab.icon}`} style={{ fontSize: '20px', padding: '8px 16px', borderRadius: '16px', background: activeTab === tab.id ? '#e0e7ff' : 'transparent', transition: '0.2s' }}></i>
            <span>{tab.label}</span>
          </div>
        ))}
      </nav>

      {/* AUTH OVERLAY */}
      {isAuthOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>👋</div>
            <h2 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-head)', fontSize: '24px' }}>Welcome to Khata</h2>
            <p style={{ color: theme.textSub, fontSize: '14px', marginBottom: '24px', fontWeight: 600 }}>Enter your phone number to access your digital bills & local stores.</p>
            <input 
              type="tel" value={authInput} onChange={(e) => setAuthInput(e.target.value)}
              placeholder="10-digit Mobile No." maxLength={10}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px', fontWeight: 700, marginBottom: '16px', textAlign: 'center', letterSpacing: '2px', outline: 'none', boxSizing: 'border-box' }} 
            />
            <button onClick={handleLogin} disabled={isLoading} style={{ background: theme.gradient, color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: 800, width: '100%', cursor: 'pointer', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)' }}>
              {isLoading ? 'Verifying...' : 'Enter Securely ➔'}
            </button>
            <div style={{ marginTop: '16px', fontSize: '12px', color: theme.textSub, fontWeight: 600 }}>
               (Try using the phone number you entered during billing!)
            </div>
          </div>
        </div>
      )}

      {/* THERMAL RECEIPT MODAL */}
      {viewingReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: '#f8fafc', padding: '20px 16px', borderRadius: '8px', width: '100%', maxWidth: '350px', position: 'relative' }}>
            <button onClick={() => setViewingReceipt(null)} style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            
            {/* The Thermal Paper Look */}
            <div style={{ background: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#000', padding: '20px 10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>{profile?.shopName || 'BharatPOS Store'}</h2>
                <div>INV: {viewingReceipt.id}</div>
                <div>{new Date(viewingReceipt.timestamp).toLocaleString()}</div>
              </div>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px dashed #000' }}>
                    <th style={{ padding: '4px 0' }}>Item</th>
                    <th style={{ padding: '4px 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingReceipt.items.map((i, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc' }}>{i.name}<br/><small>{i.variantName}</small></td>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'center' }}>{i.qty}</td>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{formatCurrency(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop: '1.5px dashed #000', paddingTop: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px' }}>
                  <span>Total Bill:</span> <span>{formatCurrency(viewingReceipt.total)}</span>
                </div>
                {viewingReceipt.split && viewingReceipt.split.udhaar > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', marginTop: '8px', color: '#dc2626' }}>
                    <span>Pending Udhaar:</span> <span>{formatCurrency(viewingReceipt.split.udhaar)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REUSED VARIANT MODAL FOR ORDERING */}
      <VariantModal 
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        product={selectedProduct}
        onConfirm={(product, variantId, qty) => {
          handleAddToCart(product, variantId, qty); 
          setIsVariantModalOpen(false);
        }}
      />
    </div>
  );
};

export default CustomerPortal;