import React, { useState, useMemo } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { useDataStore } from '../../store/useDataStore';
import { calculateCartTotal } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { ProductCard } from '../../components/shared/ProductCard';
import { CheckoutModal } from '../../components/pos/CheckoutModal';
import { VariantModal } from '../../components/pos/VariantModal';
import { CustomerSelector } from '../../components/pos/CustomerSelector';
import type { Product, Sale, Customer, CartItem } from '../../types';

export const PointOfSale: React.FC = () => {
  // --- UI STATE ---
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // --- CATALOG STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // --- CUSTOMER & CART STATE ---
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // Held Carts Feature
  const [heldCarts, setHeldCarts] = useState<{ id: string; items: CartItem[]; phone: string; name: string }[]>([]);

  // --- GLOBAL STORES (Firebase Powered) ---
  const products = useDataStore((state) => state.products);
  const customers = useDataStore((state) => state.customers);
  const addSale = useDataStore((state) => state.addSale);
  const updateCustomer = useDataStore((state) => state.updateCustomer);
  
  const { items, addItem, removeItem, clearCart, setItems } = useCartStore();
  
  // --- CALCULATIONS ---
  const cartTotal = calculateCartTotal(items);
  const totalItemsCount = items.reduce((sum, item) => sum + item.qty, 0);

  // Extract unique categories for the filter chips
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory === 'ALL' || p.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, activeCategory]);

  // --- ACTIONS ---

  const handleHoldCart = () => {
    if (items.length === 0) return alert("Cart is empty!");
    setHeldCarts([...heldCarts, { id: Date.now().toString(), items: [...items], phone: customerPhone, name: customerName }]);
    clearCart();
    setCustomerPhone('');
    setCustomerName('');
    alert("Cart placed on hold.");
  };

  const handleRestoreCart = () => {
    if (heldCarts.length === 0) return alert("No held carts.");
    const lastCart = heldCarts[heldCarts.length - 1];
    setItems(lastCart.items);
    setCustomerPhone(lastCart.phone);
    setCustomerName(lastCart.name);
    setHeldCarts(heldCarts.slice(0, -1)); // Remove from hold
  };

  const handleCheckoutConfirm = async (paymentSplit: { cash: number; online: number; udhaar: number }) => {
    if (paymentSplit.udhaar > 0 && customerPhone.length !== 10) {
      alert("Error: A 10-digit Mobile Number is required to give Udhaar!");
      return;
    }

    let mode: 'Cash' | 'Online' | 'Partial' | 'Udhaar' = 'Partial';
    if (paymentSplit.udhaar === cartTotal) mode = 'Udhaar';
    else if (paymentSplit.cash === cartTotal) mode = 'Cash';
    else if (paymentSplit.online === cartTotal) mode = 'Online';

    let finalCustomerId = undefined;
    
    // --- FIREBASE: SYNC CUSTOMER DATA ---
    if (customerPhone.length === 10) {
      const existingCustomer = customers.find(c => c.phone === customerPhone);
      
      if (!existingCustomer) {
        // Generate new customer
        const newCustomer: Customer = {
          id: `CUST-${Math.random().toString(36).substring(7)}`,
          name: customerName || 'Unknown',
          phone: customerPhone,
          totalSpent: cartTotal,
          visitCount: 1,
          lastVisit: new Date().toISOString(),
          pendingUdhaar: paymentSplit.udhaar,
          history: []
        };
        await updateCustomer(newCustomer); // Push to cloud
        finalCustomerId = newCustomer.id;
      } else {
        // Update existing customer stats
        finalCustomerId = existingCustomer.id;
        await updateCustomer({
          ...existingCustomer,
          name: customerName || existingCustomer.name,
          totalSpent: (existingCustomer.totalSpent || 0) + cartTotal,
          visitCount: (existingCustomer.visitCount || 0) + 1,
          lastVisit: new Date().toISOString(),
          pendingUdhaar: (existingCustomer.pendingUdhaar || 0) + paymentSplit.udhaar
        }); // Push to cloud
      }
    }

    // --- FIREBASE: SYNC SALE DATA ---
    const newSale: Sale = {
      id: `INV-${Math.floor(100000 + Math.random() * 900000)}`, 
      timestamp: new Date().toISOString(),
      items: [...items],
      total: cartTotal,
      paymentMethod: mode,
      isPaid: mode !== 'Udhaar',
      customerId: finalCustomerId,
      split: paymentSplit
    };

    await addSale(newSale); // Push to cloud

    alert(`Success! Invoice ${newSale.id} created.\nCheck the Sales Ledger & Khata!`);
    clearCart();
    setCustomerPhone('');
    setCustomerName('');
    setIsCheckoutModalOpen(false);
    setIsMobileCartOpen(false); 
  };

  return (
    <div className="pos-container">
      
      {/* ================= LEFT PANE: INVENTORY ================= */}
      <div className="left-pane">
        
        {/* HTML Merged: Catalog Header */}
        <div className="catalog-header">
            <div className="search-bar-wrapper">
                <div className="search-box">
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }}></i>
                    <input 
                      type="text" 
                      placeholder="Search products..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '8px', border: '1.5px solid var(--border)', outline: 'none' }}
                    />
                </div>
            </div>
            
            {/* HTML Merged: Dynamic Category Chips */}
            <div className="cat-filters" style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: activeCategory === cat ? 'none' : '1px solid var(--border)',
                      backgroundColor: activeCategory === cat ? 'var(--primary)' : 'white',
                      color: activeCategory === cat ? 'white' : 'var(--text-main)',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat}
                  </button>
                ))}
            </div>
        </div>

        {/* Product Grid */}
        <div className="product-grid" style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', alignContent: 'flex-start' }}>
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id}
              product={product}
              actionLabel="Add"
              onActionClick={(p) => {
                if (p.variants.length === 1 && !p.isLoose) {
                  addItem(p);
                } else {
                  setSelectedProduct(p);
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
        
        {/* HTML Merged: Cart Header with Hold Buttons */}
        <div className="cart-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <h3 style={{ margin:0, fontSize:'15px', fontWeight:800, display:'flex', alignItems:'center', gap:'8px' }}>
                    🛒 Current Bill
                </h3>
                <div style={{ display:'flex', gap:'5px' }}>
                    <button onClick={handleHoldCart} className="btn btn-outline" style={{ padding:'5px 10px', fontSize:'11px', borderRadius:'6px' }} title="Save cart for later">
                      ⏸️ Hold
                    </button>
                    <button onClick={handleRestoreCart} className="btn btn-outline" style={{ padding:'5px 10px', fontSize:'11px', borderRadius:'6px' }} title="View held carts">
                      📥 Restore {heldCarts.length > 0 ? `(${heldCarts.length})` : ''}
                    </button>
                    {isMobileCartOpen && (
                      <button onClick={() => setIsMobileCartOpen(false)} style={{ padding:'5px 12px', fontSize:'14px', borderRadius:'6px', color:'white', background:'var(--danger)', border:'none' }}>
                        ✕
                      </button>
                    )}
                </div>
            </div>
        </div>

        {/* Customer Selector */}
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <CustomerSelector 
            phone={customerPhone}
            name={customerName}
            onPhoneChange={setCustomerPhone}
            onNameChange={setCustomerName}
          />
        </div>
        
        {/* HTML Merged: Cart Items List */}
        <div className="cart-items">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-basket-shopping" style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem' }}></i>
              <p>Scan or add items to bill</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.prodId}-${item.variantId}`} className="cart-item">
                <div className="ci-details">
                  <div className="ci-name">{item.name}</div>
                  <div className="ci-meta">{item.variantName}</div>
                  <div className="ci-meta" style={{ marginTop: '4px', fontWeight: 'bold' }}>
                    {item.qty} x {formatCurrency(item.price)}
                  </div>
                </div>
                <div className="ci-pricing">
                  <button className="ci-del" onClick={() => removeItem(item.prodId, item.variantId)}>✕</button>
                  <div className="ci-total">{formatCurrency(item.total)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* HTML Merged: Cart Summary & Create Bill Button */}
        <div className="cart-summary">
            <div className="summary-row">
                <span>Items: <span>{totalItemsCount}</span></span>
                <span>Subtotal: <span style={{ fontFamily:'monospace' }}>{formatCurrency(cartTotal)}</span></span>
            </div>
            <div className="summary-total">
                <span>Grand Total:</span>
                <span>{formatCurrency(cartTotal)}</span>
            </div>

            <div style={{ marginTop: '15px' }}>
              <button 
                onClick={() => setIsCheckoutModalOpen(true)} 
                disabled={items.length === 0}
                style={{ 
                  width: '100%', padding: '15px', fontSize: '15px', fontWeight: 800, 
                  backgroundColor: items.length === 0 ? 'var(--bg-input)' : 'var(--primary)', 
                  color: items.length === 0 ? 'var(--text-muted)' : 'white', 
                  border: 'none', borderRadius: '8px', cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: items.length === 0 ? 'none' : '0 6px 20px rgba(99, 102, 241, 0.4)'
                }}>
                <i className="fa-solid fa-check-circle"></i> Create Bill
              </button>
            </div>
        </div>
      </div>

      {/* ================= HTML Merged: MOBILE FAB BUTTON ================= */}
      <div className="mobile-cart-fab" onClick={() => setIsMobileCartOpen(true)} style={{ display: window.innerWidth <= 900 ? 'flex' : 'none' }}>
        🛒
        {totalItemsCount > 0 && <div className="mobile-cart-badge">{totalItemsCount}</div>}
      </div>

      {/* ================= MODALS ================= */}
      <VariantModal 
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        product={selectedProduct}
        onConfirm={(product, variantId, qty) => {
          addItem(product, variantId, qty); 
          setIsVariantModalOpen(false);
        }}
      />
     
      <CheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartTotal={cartTotal}
        onConfirm={handleCheckoutConfirm}
      />
    </div> 
  );
};

export default PointOfSale;