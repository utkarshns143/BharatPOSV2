// File: src/pages/customer/CustomerPortal.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCustomerStore } from '../../store/useCustomerStore';
import { db } from '../../lib/firebase';
import { collection, collectionGroup, getDocs, addDoc } from 'firebase/firestore';
import type { Product, Sale } from '../../types';

import './CustomerPortal.css';

declare const L: any;

export const CustomerPortal: React.FC = () => {
  // Global Secure State
  const { phone, setPhone, myBills, shopsMap, activeShopId, setActiveShopId, fetchMyKhata, logoutCustomer } = useCustomerStore();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'bills' | 'store' | 'khoj'>('bills');
  const [isAuthOpen, setIsAuthOpen] = useState(!phone);
  const [authInput, setAuthInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Bills State
  const [billFilter, setBillFilter] = useState<'PENDING' | 'PAID'>('PENDING');
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);

  // Store State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCat, setActiveCat] = useState('ALL');
  const [cart, setCart] = useState<Record<string, any>>({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizProd, setWizProd] = useState<Product | null>(null);
  const [wizVariant, setWizVariant] = useState<any | null>(null);
  const [wizQty, setWizQty] = useState(1);

  // Map State
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const routingRef = useRef<any>(null);
  const [mapDistance, setMapDistance] = useState<string | null>(null);
  const [khojSearch, setKhojSearch] = useState('');

  // ════════════════════════════════════════════════════════════
  // INITIALIZATION & AUTH
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    if (phone && phone.length === 10) {
      setIsAuthOpen(false);
      fetchMyKhata();
    }
  }, [phone, fetchMyKhata]);

  const handleLogin = () => {
    if (authInput.length !== 10) return alert("Please enter a valid 10-digit number.");
    setIsLoading(true);
    setTimeout(() => {
      setPhone(authInput);
      setIsLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    if (window.confirm("Log out of your Khata?")) {
      logoutCustomer();
      setAuthInput('');
      setIsAuthOpen(true);
      setCart({});
    }
  };

  // ════════════════════════════════════════════════════════════
  // BILLS LOGIC (Translated from khata_bills.js)
  // ════════════════════════════════════════════════════════════
  const { pendingBills, paidBills, totalSpent, totalPending } = useMemo(() => {
    let tSpent = 0; let tPending = 0;
    const pBills: Sale[] = []; const resBills: Sale[] = [];
    
    const filteredSales = activeShopId === 'ALL' ? myBills : myBills.filter(s => s._branchId === activeShopId);

    filteredSales.forEach(sale => {
      const isPending = !sale.isPaid && (sale.paymentMethod === 'Udhaar' || (sale.paymentMethod === 'Partial' && sale.split && sale.split.udhaar > 0));
      const pendingAmt = sale.split?.udhaar || sale.total;

      if (isPending) {
        tPending += pendingAmt;
        pBills.push({ ...sale, _pendingAmt: pendingAmt } as any);
      } else {
        tSpent += sale.total;
        resBills.push(sale);
      }
    });

    return { 
      pendingBills: pBills.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), 
      paidBills: resBills.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), 
      totalSpent: tSpent, 
      totalPending: tPending 
    };
  }, [myBills, activeShopId]);

  // ════════════════════════════════════════════════════════════
  // STORE LOGIC (Translated from khata_store.js)
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    const fetchProducts = async () => {
      if (activeTab === 'store' && activeShopId && activeShopId !== 'ALL') {
        const prodSnap = await getDocs(collection(db, "shops", activeShopId, "products"));
        const pList: Product[] = [];
        prodSnap.forEach(d => pList.push({ id: d.id, ...d.data() } as Product));
        setProducts(pList);
      }
    };
    fetchProducts();
  }, [activeTab, activeShopId]);

  const uniqueCats = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))), [products]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCat === 'ALL' || p.category === activeCat;
      const matchName = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchName;
    });
  }, [products, activeCat, searchQuery]);

  const cartTotal = Object.values(cart).reduce((sum, i) => sum + (i.price * i.qty), 0);
  const cartItemCount = Object.values(cart).reduce((sum, i) => sum + i.qty, 0);

  const openWizard = (prod: Product) => {
    setWizProd(prod);
    setWizVariant(prod.variants[0]);
    setWizQty(1);
    setIsWizardOpen(true);
  };

  const handleAddToCart = (prod: Product, variant: any, qty: number) => {
    const key = `${prod.id}_${variant.id}`;
    let price = variant.price;
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
    const name = prompt("Enter the service you need (e.g., Fan Repair, Custom Grocery List):");
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
      setActiveTab('bills');
    } catch (e) {
      alert("Failed to send order.");
    } finally {
      setIsLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // KHOJ MAP LOGIC (Translated from khata_khoj.js)
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    if (activeTab === 'khoj') {
      if (!mapRef.current) {
        const L = (window as any).L;
        const initialLoc = [20.5937, 78.9629];
        mapRef.current = L.map('leafletMap', { zoomControl: false }).setView(initialLoc, 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
        markersRef.current = L.layerGroup().addTo(mapRef.current);

        // Load all shops
        Object.values(shopsMap).forEach(shop => {
          if (shop.lat && shop.lng) {
            const dotIcon = L.divIcon({ className: 'custom-div-icon', iconSize: [14, 14] });
            L.marker([shop.lat, shop.lng], { icon: dotIcon }).addTo(markersRef.current);
          }
        });

        // Get User Location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            const loc = [pos.coords.latitude, pos.coords.longitude];
            mapRef.current.setView(loc, 13);
            L.circleMarker(loc, { radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1 }).addTo(mapRef.current).bindPopup("You are here");
            
            // Highlight Nearest
            let minD = Infinity; let nearest: any = null;
            Object.values(shopsMap).forEach(s => {
              if (s.lat && s.lng) {
                const d = Math.sqrt(Math.pow(s.lat - loc[0], 2) + Math.pow(s.lng - loc[1], 2));
                if (d < minD) { minD = d; nearest = s; }
              }
            });

            if (nearest) {
              const pinIcon = L.divIcon({ className: 'matched-pin', html: '<i class="fa-solid fa-location-dot pin-icon"></i>', iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38] });
              L.marker([nearest.lat, nearest.lng], { icon: pinIcon }).addTo(markersRef.current)
                .bindPopup(`<div style="text-align:center;"><b>Nearest Shop: ${nearest.name}</b><br><button onclick="window.drawRoute(${nearest.lat}, ${nearest.lng}, ${loc[0]}, ${loc[1]})" style="background:#6366f1;color:white;border:none;padding:5px 10px;border-radius:5px;margin-top:5px;cursor:pointer;">Get Route</button></div>`).openPopup();
            }
          });
        }

        // Expose routing to global scope for Leaflet popups
        (window as any).drawRoute = (tLat: number, tLng: number, uLat: number, uLng: number) => {
          if (routingRef.current) mapRef.current.removeControl(routingRef.current);
          routingRef.current = L.Routing.control({
            waypoints: [L.latLng(uLat, uLng), L.latLng(tLat, tLng)],
            routeWhileDragging: false, addWaypoints: false, show: false,
            lineOptions: { styles: [{ color: '#6366f1', opacity: 0.8, weight: 6 }] }
          }).addTo(mapRef.current);

          routingRef.current.on('routesfound', (e: any) => {
            setMapDistance(`${(e.routes[0].summary.totalDistance / 1000).toFixed(2)} km`);
          });
        };
      }
      
      else {
        setTimeout(() => mapRef.current.invalidateSize(), 100);
      }
    }
  }, [activeTab, shopsMap]);

  const handleKhojSearch = async () => {
    if (!khojSearch) return;
    markersRef.current.clearLayers();
    
    // Re-add background dots
    Object.values(shopsMap).forEach(shop => {
      if (shop.lat && shop.lng) L.marker([shop.lat, shop.lng], { icon: L.divIcon({ className: 'custom-div-icon', iconSize: [14, 14] }) }).addTo(markersRef.current);
    });

    const q = khojSearch.toLowerCase();
    const prodSnap = await getDocs(collectionGroup(db, 'products'));
    const foundShops: Record<string, any> = {};

    prodSnap.forEach(d => {
      const p = d.data();
      const sId = d.ref.parent.parent?.id;
      if (p.name?.toLowerCase().includes(q) && sId && shopsMap[sId]) {
        if (!foundShops[sId]) foundShops[sId] = { shop: shopsMap[sId], products: [] };
        foundShops[sId].products.push(p);
      }
    });

    if (Object.keys(foundShops).length > 0) {
      const pinIcon = L.divIcon({ className: 'matched-pin', html: '<i class="fa-solid fa-location-dot pin-icon"></i>', iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38] });
      Object.values(foundShops).forEach(s => {
        L.marker([s.shop.lat, s.shop.lng], { icon: pinIcon }).addTo(markersRef.current)
          .bindPopup(`<div style="text-align:center;"><b>${s.shop.name}</b><br>Has ${s.products.length} matches.</div>`);
      });
      mapRef.current.fitBounds(new L.featureGroup(markersRef.current.getLayers()).getBounds().pad(0.1));
    } else {
      alert("No shops found selling this item nearby.");
    }
  };

  // ════════════════════════════════════════════════════════════
  // RENDER UI
  // ════════════════════════════════════════════════════════════
  return (
    <div className="khata-app">
      <header className="app-header">
        <div className="app-brand">Khata</div>
        {Object.keys(shopsMap).length > 0 && activeTab !== 'khoj' && (
          <div className="shop-selector-wrapper" style={{ display: 'block' }}>
            <i className="fa-solid fa-store"></i>
            <select className="shop-selector" value={activeShopId || ''} onChange={e => setActiveShopId(e.target.value)}>
              <option value="ALL">All My Shops</option>
              {Object.values(shopsMap).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {phone && <div className="user-chip" onClick={handleLogout}><i className="fa-solid fa-right-from-bracket"></i></div>}
      </header>

      {/* --- TAB: BILLS --- */}
      <main className={`tab-view ${activeTab === 'bills' ? 'active' : ''}`}>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase' }}>Total Lifetime Spent Here</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>₹{totalSpent.toFixed(2)}</div>
          </div>
        </div>

        <div className="tab-switch">
          <button className={`tab-btn ${billFilter === 'PENDING' ? 'active' : ''}`} onClick={() => setBillFilter('PENDING')}>Pending (₹{totalPending.toFixed(2)})</button>
          <button className={`tab-btn ${billFilter === 'PAID' ? 'active' : ''}`} onClick={() => setBillFilter('PAID')}>Resolved Bills</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(billFilter === 'PENDING' ? pendingBills : paidBills).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)', fontWeight: 600 }}>No {billFilter.toLowerCase()} bills found.</div>
          ) : (
            (billFilter === 'PENDING' ? pendingBills : paidBills).map((b: any) => (
              <div key={b.id} className="bill-card" onClick={() => setViewingReceipt(b)}>
                <div className="bill-header">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>{shopsMap[b._branchId]?.name || 'Local Shop'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-sub)', fontWeight: 600, marginTop: '2px' }}>{new Date(b.timestamp).toLocaleDateString()} • #{b.id.slice(-6)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: '16px', color: billFilter === 'PENDING' ? '#ef4444' : '#10b981' }}>
                      ₹{Number(billFilter === 'PENDING' ? b._pendingAmt : b.total).toFixed(2)}
                    </div>
                    <div style={{ marginTop: '4px', display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', background: billFilter === 'PENDING' ? '#fee2e2' : '#d1fae5', color: billFilter === 'PENDING' ? '#ef4444' : '#10b981' }}>
                      {billFilter === 'PENDING' ? 'Due' : 'Paid'}
                    </div>
                  </div>
                </div>
                <div className="bill-items">{b.items.map((i: any) => `${i.qty}x ${i.name}`).join(', ')}</div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* --- TAB: STORE --- */}
      <main className={`tab-view ${activeTab === 'store' ? 'active' : ''}`}>
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
      </main>

      {/* --- TAB: KHOJ --- */}
      <main className={`tab-view ${activeTab === 'khoj' ? 'active' : ''}`} style={{ padding: 0 }}>
        <div id="leafletMap" style={{ width: '100%', height: 'calc(100vh - 140px)', borderRadius: '24px 24px 0 0' }}></div>
        <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000, background: 'white', padding: '14px 20px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px solid var(--brand-primary)' }}>
            <i className="fa-solid fa-radar" style={{ color: 'var(--brand-primary)' }}></i>
            <input type="text" placeholder="Find 'Atta' nearby..." value={khojSearch} onChange={e => setKhojSearch(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 600 }} />
            <button onClick={handleKhojSearch} style={{ background: 'var(--brand-primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 800 }}><i className="fa-solid fa-magnifying-glass"></i></button>
        </div>
        {mapDistance && <div style={{ position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '12px', zIndex: 2000, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}><i className="fa-solid fa-route"></i> Distance: {mapDistance}</div>}
      </main>

      {/* --- NAV & MODALS --- */}
      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveTab('bills')}><i className="fa-solid fa-file-invoice-dollar"></i><span>Bills</span></div>
        <div className={`nav-item ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}><i className="fa-solid fa-basket-shopping"></i><span>Order</span></div>
        <div className={`nav-item ${activeTab === 'khoj' ? 'active' : ''}`} onClick={() => setActiveTab('khoj')}><i className="fa-solid fa-radar"></i><span>Khoj</span></div>
      </nav>

      {/* Auth Modal */}
      {isAuthOpen && (
        <div className="khata-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="khata-modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>👋</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Welcome to Khata</h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginBottom: '24px', fontWeight: 600 }}>Enter your phone number to access your digital bills & stores.</p>
            <input type="tel" className="auth-input" value={authInput} onChange={e => setAuthInput(e.target.value)} placeholder="10-digit Mobile No." maxLength={10} />
            <button className="btn-main" onClick={handleLogin} disabled={isLoading}>{isLoading ? 'Syncing...' : 'Enter Securely ➔'}</button>
          </div>
        </div>
      )}

      {/* Store Wizard Modal */}
      {isWizardOpen && wizProd && (
        <div className="khata-modal-overlay">
          <div className="khata-modal-box">
            <button className="btn-close" onClick={() => setIsWizardOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>{wizProd.name}</h3>
            
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: '10px' }}>Select Type/Size</div>
            <div className="wizard-step-grid">
              {wizProd.variants.map(v => (
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
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: '10px' }}>Quantity</div>
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

      {/* Thermal Receipt Modal */}
      {viewingReceipt && (
        <div className="khata-modal-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="khata-modal-box" style={{ background: '#f8fafc', padding: '20px 16px' }}>
            <button className="btn-close" onClick={() => setViewingReceipt(null)}><i className="fa-solid fa-xmark"></i></button>
            <div style={{ background: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', padding: '10px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1.5px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
<h2 style={{ margin: 0, fontSize: '16px' }}>{shopsMap[viewingReceipt._branchId || '']?.name || 'Retail Store'}</h2>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>TAX INVOICE</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span>Inv: #{viewingReceipt.id.slice(-6)}</span>
                <span>Date: {new Date(viewingReceipt.timestamp).toLocaleDateString()}</span>
              </div>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead><tr style={{ borderBottom: '1px dashed #000' }}><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {viewingReceipt.items.map((i, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc' }}>{i.name}<br/><span style={{ fontSize: '10px', color: '#555' }}>{i.variantName}</span></td>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'center' }}>{i.qty}</td>
                      <td style={{ padding: '6px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{i.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ borderTop: '1.5px dashed #000', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
                  <span>Grand Total:</span><span>₹{viewingReceipt.total.toFixed(2)}</span>
                </div>
                {viewingReceipt.split && viewingReceipt.split.udhaar > 0 && !viewingReceipt.isPaid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                    <span>PENDING UDHAAR:</span><span>₹{viewingReceipt.split.udhaar}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerPortal;