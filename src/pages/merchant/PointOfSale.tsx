// File: src/pages/merchant/PointOfSale.tsx

import React, { useState, useMemo } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { useDataStore } from '../../store/useDataStore';
import type { Product, Sale, Customer, CartItem } from '../../types';

// Restored Imports
import { ProductCard } from '../../components/shared/ProductCard';
import { VariantModal } from '../../components/pos/VariantModal';
import { CheckoutModal } from '../../components/pos/CheckoutModal';
import { CustomerSelector } from '../../components/pos/CustomerSelector';
import { InvoiceModal } from '../../components/sales/InvoiceModal';

import './PointOfSale.css';

declare const Quagga: any;

export const PointOfSale: React.FC = () => {

  const { items, addItem, addCustomItem, updateQty, removeItem, clearCart, setItems, discount, setDiscount } = useCartStore();

  const totalItemsCount = items.reduce((sum, item) => sum + item.qty, 0);

  // --- UI & MODAL STATE ---
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [invoiceSale, setInvoiceSale] = useState<Sale | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // --- CATALOG STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // --- CUSTOMER & CART STATE ---
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online' | 'Partial' | 'Udhaar'>('Cash');
  const [heldCarts, setHeldCarts] = useState<{ id: string; items: CartItem[]; phone: string; name: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- GLOBAL STORES ---
  const products = useDataStore((state) => state.products);
  const customers = useDataStore((state) => state.customers);
  const addSale = useDataStore((state) => state.addSale);
  const updateCustomer = useDataStore((state) => state.updateCustomer);
  const updateProduct = useDataStore((state) => state.updateProduct);

  // ════════════════════════════════════════════════════════════
  // 1. DATA PREP & FILTERS
  // ════════════════════════════════════════════════════════════
  const uniqueCats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory !== 'ALL') {
      result = result.filter(p => p.category?.toLowerCase() === activeCategory.toLowerCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.variants.some(v => v.barcode?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  // ════════════════════════════════════════════════════════════
  // 2. CART LOGIC
  // ════════════════════════════════════════════════════════════
 const { subtotal, totalGst, grandTotal } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    items.forEach(item => {
      const itemGstRate = (item as any).gstRate || 0; // Default to 0
      const itemPriceType = ((item as any).priceType as 'inclusive' | 'exclusive') || 'inclusive'; // Default to inclusive

      if (itemGstRate > 0) {
        if (itemPriceType === 'exclusive') {
          tax += item.total * (itemGstRate / 100);
          sub += item.total;
        } else {
          const base = item.total / (1 + (itemGstRate / 100));
          tax += (item.total - base);
          sub += base;
        }
      } else {
        sub += item.total;
      }
    });
    // ... Apply discount after tax
    const d = Number(discount) || 0;
    return { subtotal: sub, totalGst: tax, grandTotal: Math.max(0, sub + tax - d) };
  }, [items, discount]);

  const handleCustomService = () => {
    const name = prompt("Enter Custom Service / Item Name:");
    if (!name) return;
    const price = prompt("Enter Price (₹):");
    if (!price || isNaN(Number(price))) return;
    addCustomItem(name, Number(price));
  };

  // ════════════════════════════════════════════════════════════
  // 3. CHECKOUT LOGIC
  // ════════════════════════════════════════════════════════════
  const handleCheckoutTrigger = () => {
    if (items.length === 0) return alert("Cart is empty");
    if (paymentMode === 'Udhaar' && customerPhone.length !== 10) return alert("Customer 10-digit mobile required for Udhaar");
    
    if (paymentMode === 'Partial') {
      setIsCheckoutModalOpen(true);
    } else {
      processCheckout(paymentMode);
    }
  };

  const processCheckout = async (method: string, split?: { cash: number, online: number, udhaar: number }) => {
    setIsProcessing(true);
    try {
      let cashAmt = 0, onlineAmt = 0, udhaarAmt = 0;

      if (method === 'Cash') cashAmt = grandTotal;
      else if (method === 'Online') onlineAmt = grandTotal;
      else if (method === 'Udhaar') udhaarAmt = grandTotal;
      else if (method === 'Partial' && split) {
        cashAmt = split.cash; onlineAmt = split.online; udhaarAmt = split.udhaar;
      }

      let finalCustomerId = undefined;
      
      if (customerPhone.length === 10) {
        const existingCustomer = customers.find(c => c.phone === customerPhone);
        if (!existingCustomer) {
          const newCustomer: Customer = {
            id: `CUST-${Math.random().toString(36).substring(7)}`,
            name: customerName || 'Unknown', phone: customerPhone,
            totalSpent: grandTotal, visitCount: 1, lastVisit: new Date().toISOString(),
            pendingUdhaar: udhaarAmt, history: []
          };
          await updateCustomer(newCustomer);
          finalCustomerId = newCustomer.id;
        } else {
          finalCustomerId = existingCustomer.id;
          await updateCustomer({
            ...existingCustomer,
            name: customerName || existingCustomer.name,
            totalSpent: (existingCustomer.totalSpent || 0) + grandTotal,
            visitCount: (existingCustomer.visitCount || 0) + 1,
            lastVisit: new Date().toISOString(),
            pendingUdhaar: (existingCustomer.pendingUdhaar || 0) + udhaarAmt
          });
        }
      }
// 1. Build the base sale object WITHOUT the optional fields
      const newSale: Sale = {
        id: `INV-${Math.floor(100000 + Math.random() * 900000)}`, 
        timestamp: new Date().toISOString(),
        items: [...items], 
        total: grandTotal,
        paymentMethod: method as any, 
        isPaid: method !== 'Udhaar',
        customerName: customerName || '', 
        customerPhone: customerPhone || '',
        discount: Number(discount) || 0,
      };

      // 2. ONLY add these keys if they have actual data (prevents Firebase "undefined" error)
      if (finalCustomerId) {
        newSale.customerId = finalCustomerId;
      }
      if (method === 'Partial') {
        newSale.split = { cash: cashAmt, online: onlineAmt, udhaar: udhaarAmt };
      }
      // Exact Loose Logic Deduction
      const productsToUpdate = new Map<string, Product>();
      items.forEach(item => {
        if ((item as any).isService) return;
        const p = products.find(prod => prod.id === item.prodId);
        if (p) {
          const pCopy = productsToUpdate.get(p.id) || JSON.parse(JSON.stringify(p));
          const v = pCopy.variants.find((vx: any) => vx.id === item.variantId);
          if (v) {
            let deduction = item.qty;
            if (pCopy.isLoose) deduction = item.qty / (Number(v.baseQty) || 1);
            v.stock = Number(v.stock) - deduction;
          }
          productsToUpdate.set(p.id, pCopy);
        }
      });

      for (const p of Array.from(productsToUpdate.values())) {
        await updateProduct(p);
      }

      await addSale(newSale);

      setIsCheckoutModalOpen(false);
      setInvoiceSale(newSale);
      setIsMobileCartOpen(false);

    } catch (err) {
      alert("Transaction failed");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCartUI = () => {
    clearCart(); setCustomerName(''); setCustomerPhone(''); setPaymentMode('Cash');
    setInvoiceSale(null);
  };

  // ════════════════════════════════════════════════════════════
  // 5. SCANNER LOGIC
  // ════════════════════════════════════════════════════════════
  const startScanner = () => {
    setIsScannerOpen(true);
    setTimeout(() => {
      if (typeof Quagga !== 'undefined') {
        Quagga.init({
          inputStream: { name: "Live", type: "LiveStream", target: document.querySelector('#quaggaPreview'), constraints: { facingMode: "environment" } },
          decoder: { readers: ["ean_reader", "upc_reader", "code_128_reader"] }
        }, (err: any) => {
          if (err) { alert("Scanner failed"); return; }
          Quagga.start();
        });

        Quagga.onDetected((result: any) => {
          if (result.codeResult.code) {
            const code = result.codeResult.code;
            Quagga.stop();
            setIsScannerOpen(false);
            
            let foundProd = null;
            products.forEach(p => {
              const v = p.variants.find(vx => vx.barcode === code);
              if (v) { foundProd = p; }
            });

            if (foundProd) {
              setSelectedProduct(foundProd);
              setIsVariantModalOpen(true);
            } else {
              alert("Product not found in inventory");
            }
          }
        });
      } else {
        alert("Scanner library not loaded.");
      }
    }, 100);
  };

  // ════════════════════════════════════════════════════════════
  // RENDER UI
  // ════════════════════════════════════════════════════════════
  return (
    <div className="pos-container">
      
      {/* ================= LEFT PANE: INVENTORY ================= */}
      <div className="left-pane">
        <div className="catalog-header">
            <div className="search-bar-wrapper">
                <div className="search-box">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input type="text" placeholder="Search products or scan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <button className="barcode-btn" onClick={startScanner} title="Scan Barcode"><i className="fa-solid fa-barcode"></i></button>
                </div>
            </div>
            
            <div className="cat-filters">
                <button className={`cat-chip ${activeCategory === 'ALL' ? 'active' : ''}`} onClick={() => setActiveCategory('ALL')}>All Items</button>
                {uniqueCats.map(cat => (
                  <button key={cat} className={`cat-chip ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
                ))}
            </div>
        </div>

        <div className="product-grid">
          <div className="prod-card" onClick={handleCustomService} style={{ border: '2px dashed var(--primary)', background: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
            <div className="pc-cat" style={{ color: 'var(--primary)' }}>Custom Request</div>
            <div className="pc-name" style={{ color: 'var(--primary)', fontSize: '16px' }}>Add Service / Item</div>
            <div style={{ fontSize: '32px', textAlign: 'center', color: 'var(--primary)', margin: '10px 0' }}><i className="fa-solid fa-screwdriver-wrench"></i></div>
          </div>

          {filteredProducts.map((p) => (
             <ProductCard 
              key={p.id}
              product={p}
              onActionClick={(product) => {
                if (product.variants.length === 1 && !product.isLoose) {
                  addItem(product, product.variants[0].id, 1);
                } else {
                  setSelectedProduct(product);
                  setIsVariantModalOpen(true);
                }
              }}
            />
          ))}
          {filteredProducts.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>No products found.</p>}
        </div>
      </div>

      {/* ================= RIGHT PANE: CART ================= */}
      <div className={`right-pane ${isMobileCartOpen ? 'open' : ''}`}>
        
        <div className="cart-header">
            <h3 style={{ margin:0, fontSize:'15px', fontWeight:800, display:'flex', alignItems:'center', gap:'8px' }}>
                <i className="fa-solid fa-basket-shopping" style={{ color: 'var(--primary)' }}></i> Current Bill
            </h3>
            <div style={{ display:'flex', gap:'5px' }}>
                <button onClick={() => { setHeldCarts([...heldCarts, { id: Date.now().toString(), items: [...items], phone: customerPhone, name: customerName }]); resetCartUI(); alert("Cart Held"); }} className="btn btn-outline" style={{ padding:'5px 10px', fontSize:'11px', borderRadius:'6px' }} title="Save cart">
                  <i className="fa-regular fa-circle-pause"></i>
                </button>
                <button onClick={() => { if(heldCarts.length > 0) { setItems(heldCarts[heldCarts.length - 1].items); setCustomerName(heldCarts[heldCarts.length - 1].name); setCustomerPhone(heldCarts[heldCarts.length - 1].phone); setHeldCarts(heldCarts.slice(0,-1)); } }} className="btn btn-outline" style={{ padding:'5px 10px', fontSize:'11px', borderRadius:'6px' }} title="View held">
                  <i className="fa-solid fa-list-ul"></i> {heldCarts.length > 0 && `(${heldCarts.length})`}
                </button>
                {isMobileCartOpen && <button onClick={() => setIsMobileCartOpen(false)} style={{ padding:'5px 12px', fontSize:'14px', borderRadius:'6px', color:'white', background:'var(--danger)', border:'none' }}>✕</button>}
            </div>
        </div>

        <div style={{ borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 50 }}>
          {/* IMPORTED MODULAR SELECTOR */}
          <CustomerSelector 
            phone={customerPhone}
            name={customerName}
            onPhoneChange={setCustomerPhone}
            onNameChange={setCustomerName}
          />
        </div>
        
        <div className="cart-items">
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-cart-arrow-down" style={{ fontSize: '30px', opacity: 0.3, marginBottom: '10px' }}></i>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Cart is empty</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Tap products to add them here.</div>
            </div>
          )}
          {items.map((item) => (
            <div key={`${item.prodId}-${item.variantId}`} className="cart-item">
              <div className="ci-details">
                <div className="ci-name">{item.name}</div>
                <div className="ci-meta">{item.variantName} @ ₹{item.price.toFixed(2)}/{item.unitLabel}</div>
                <div className="ci-controls">
                  <button className="ci-btn" onClick={() => updateQty(item.prodId, item.variantId, -1)}>-</button>
                  <span className="ci-qty">{item.qty} {item.unitLabel === 'unit' ? '' : item.unitLabel}</span>
                  <button className="ci-btn" onClick={() => updateQty(item.prodId, item.variantId, 1)}>+</button>
                </div>
              </div>
              <div className="ci-pricing">
                <button className="ci-del" onClick={() => removeItem(item.prodId, item.variantId)}><i className="fa-solid fa-trash"></i></button>
                <div className="ci-total">₹{item.total.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
            <div className="summary-row">
                <span>Items: {totalItemsCount}</span>
                <span><span style={{ fontFamily: 'monospace' }}>₹</span>{subtotal.toFixed(2)}</span>
            </div>
            {totalGst > 0 && <div className="summary-row" style={{ color: 'var(--warning)' }}><span>Total GST:</span><span><span style={{ fontFamily: 'monospace' }}>₹</span>{totalGst.toFixed(2)}</span></div>}
            <div className="summary-row" style={{ color: 'var(--success)' }}>
                <span>Discount (₹):</span>
                <input type="number" value={discount === 0 ? '' : discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} style={{ width: '80px', textAlign: 'right', border: '1px solid var(--success-soft)', borderRadius: '6px', padding: '4px 8px', outline: 'none', color: 'var(--success)', fontWeight: 800 }} placeholder="0" />
            </div>
            <div className="summary-total">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
            </div>
        </div>

        <div style={{ padding: '10px 15px', background: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Payment Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {['Cash', 'Online', 'Partial', 'Udhaar'].map(mode => (
              <button key={mode} className={`btn-mode ${paymentMode === mode ? 'active' : ''}`} onClick={() => setPaymentMode(mode as any)}>
                {mode}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleCheckoutTrigger} disabled={isProcessing || items.length === 0} style={{ width: '100%', padding: '15px', fontSize: '15px', fontWeight: 800, boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)' }}>
            <i className="fa-solid fa-check-circle"></i> {isProcessing ? 'Processing...' : 'Create Bill'}
          </button>
        </div>

      </div>

      <div className="mobile-cart-fab" onClick={() => setIsMobileCartOpen(true)} style={{ display: window.innerWidth <= 900 ? 'flex' : 'none' }}>
        <i className="fa-solid fa-basket-shopping"></i>
        {totalItemsCount > 0 && <div className="mobile-cart-badge">{totalItemsCount}</div>}
      </div>

      {/* ================= IMPORTED MODALS ================= */}

      {/* 2-Step Add-To-Cart Wizard */}
      <VariantModal 
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        product={selectedProduct}
        onConfirm={(product, variantId, qty) => {
          addItem(product, variantId, qty); 
          setIsVariantModalOpen(false);
        }}
      />
     
      {/* Partial / Mix Payment Checkout Modal */}
      <CheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartTotal={grandTotal}
        customerPhone={customerPhone}
        onConfirm={processCheckout}
      />

      {/* Thermal Invoice Print Modal */}
      <InvoiceModal 
        isOpen={!!invoiceSale} 
        sale={invoiceSale} 
        onClose={resetCartUI} 
      />

      {/* Scanner Overlay */}
      {isScannerOpen && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 11000 }}>
          <div className="modal-box" style={{ background: 'transparent', boxShadow: 'none', padding: '15px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px', fontFamily: 'var(--font-head)', fontSize: '14px', color: 'white' }}><i className="fa-solid fa-barcode"></i> Scan Barcode</h4>
            <div id="quaggaPreview" style={{ width: '100%', height: '250px', background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '2px solid var(--primary)' }}>
              <div className="scan-laser" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'scan 2s linear infinite', zIndex: 10 }}></div>
            </div>
            <button type="button" className="btn btn-outline" style={{ marginTop: '15px', width: '100%', color: 'white', borderColor: 'white', background: 'transparent', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setIsScannerOpen(false); if (typeof Quagga !== 'undefined') Quagga.stop(); }}>
              <i className="fa-solid fa-xmark"></i> Cancel
            </button>
          </div>
        </div>
      )}

    </div> 
  );
};

export default PointOfSale;