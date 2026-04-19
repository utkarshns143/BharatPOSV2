import React, { useState } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { useDataStore } from '../../store/useDataStore';
import { calculateCartTotal } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatters';
import { ProductCard } from '../../components/shared/ProductCard';
import { Button } from '../../components/ui/Button';
import { CheckoutModal } from '../../components/pos/CheckoutModal';
import { VariantModal } from '../../components/pos/VariantModal';
import { CustomerSelector } from '../../components/pos/CustomerSelector';
import type { Product, Sale, Customer } from '../../types';

export const PointOfSale: React.FC = () => {
  // --- STATE ---
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  // --- STORES ---
  const products = useDataStore((state) => state.products);
  const sales = useDataStore((state) => state.sales);
  const setSales = useDataStore((state) => state.setSales);
  
  // NEW: Pulling Customers into the POS to auto-save them!
  const customers = useDataStore((state) => state.customers);
  const setCustomers = useDataStore((state) => state.setCustomers);

  const { items, addItem, removeItem, clearCart } = useCartStore();
  
  // --- CALCULATIONS ---
  const cartTotal = calculateCartTotal(items);
  const totalItemsCount = items.reduce((sum, item) => sum + item.qty, 0);

  // --- ACTIONS ---
  const handleCheckoutConfirm = (paymentSplit: { cash: number; online: number; udhaar: number }) => {
    // 1. Force phone number if Udhaar is given
    if (paymentSplit.udhaar > 0 && customerPhone.length !== 10) {
      alert("Error: A 10-digit Mobile Number is required to give Udhaar!");
      return;
    }

    // 2. Determine the exact payment mode
    let mode: 'Cash' | 'Online' | 'Partial' | 'Udhaar' = 'Partial';
    if (paymentSplit.udhaar === cartTotal) mode = 'Udhaar';
    else if (paymentSplit.cash === cartTotal) mode = 'Cash';
    else if (paymentSplit.online === cartTotal) mode = 'Online';

    // 3. --- NEW FEATURE: AUTO-SAVE CUSTOMER ---
    let finalCustomerId = undefined;
    
    if (customerPhone.length === 10) {
      const existingCustomer = customers.find(c => c.phone === customerPhone);
      
      if (!existingCustomer) {
        // Create brand new customer
        const newCustomer: Customer = {
          id: `CUST-${Math.random().toString(36).substring(7)}`,
          name: customerName || 'Unknown',
          phone: customerPhone,
          totalSpent: 0, // Khata page calculates this dynamically anyway
          visitCount: 0,
          lastVisit: new Date().toISOString(),
          pendingUdhaar: 0,
          history: []
        };
        setCustomers([...customers, newCustomer]);
        finalCustomerId = newCustomer.id;
      } else {
        // Use existing customer
        finalCustomerId = existingCustomer.id;
        
        // Optional: Update their name if they were previously "Unknown"
        if (customerName && existingCustomer.name === 'Unknown') {
          const updatedCustomers = customers.map(c => 
            c.id === existingCustomer.id ? { ...c, name: customerName } : c
          );
          setCustomers(updatedCustomers);
        }
      }
    }

    // 4. Create the final Sale object
    const newSale: Sale = {
      id: `INV-${Math.floor(100000 + Math.random() * 900000)}`, 
      timestamp: new Date().toISOString(),
      items: [...items],
      total: cartTotal,
      paymentMethod: mode,
      isPaid: mode !== 'Udhaar',
      customerId: finalCustomerId, // Link the Sale to the Customer ID!
      split: paymentSplit
    };

    // 5. Save to the persistent local database
    setSales([...sales, newSale]);

    // 6. Cleanup the screen
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
        <h2 style={{ marginBottom: '1rem' }}>Point of Sale</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {products.map((product) => (
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
          {products.length === 0 && <p>No products in inventory yet. Go to Inventory to add some!</p>}
        </div>
      </div>

      {/* ================= RIGHT PANE: CART ================= */}
      <div className={`right-pane ${isMobileCartOpen ? 'open' : ''}`}>
        
        {/* Cart Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <h3 style={{ margin: 0 }}>Current Bill</h3>
          {isMobileCartOpen && (
            <Button variant="danger" onClick={() => setIsMobileCartOpen(false)} style={{ padding: '0.5rem 1rem' }}>Close</Button>
          )}
        </div>

        {/* Customer Selector */}
        <CustomerSelector 
          phone={customerPhone}
          name={customerName}
          onPhoneChange={setCustomerPhone}
          onNameChange={setCustomerName}
        />
        
        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {items.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={`${item.prodId}-${item.variantId}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>{item.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.variantName}</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '4px' }}>
                    {item.qty} x {formatCurrency(item.price)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <button onClick={() => removeItem(item.prodId, item.variantId)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                  <strong>{formatCurrency(item.total)}</strong>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', backgroundColor: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            <span>Total:</span>
            <span style={{ color: 'var(--success)' }}>{formatCurrency(cartTotal)}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" onClick={clearCart}>Clear</Button>
            <Button variant="primary" fullWidth onClick={() => setIsCheckoutModalOpen(true)} disabled={items.length === 0}>
              Checkout
            </Button>
          </div>
        </div>
      </div>

      {/* ================= MOBILE FAB BUTTON ================= */}
      <button className="mobile-cart-fab" onClick={() => setIsMobileCartOpen(true)}>
        🛒
        {totalItemsCount > 0 && <div className="mobile-cart-badge">{totalItemsCount}</div>}
      </button>

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