import React, { useState, useMemo } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { InvoiceModal } from '../../components/sales/InvoiceModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import type { Sale } from '../../types';

export const Sales: React.FC = () => {
  const sales = useDataStore(state => state.sales);
  const customers = useDataStore(state => state.customers);
  const setSales = useDataStore(state => state.setSales);
  
  // NEW: Cloud Actions
  const updateSale = useDataStore(state => state.updateSale);
  const updateCustomer = useDataStore(state => state.updateCustomer);

  // Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [settlingSale, setSettlingSale] = useState<Sale | null>(null);
  
  // Settlement Form State
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleMode, setSettleMode] = useState<'Cash' | 'Online'>('Cash');
  const [isSettling, setIsSettling] = useState(false);

  // --- FILTERING LOGIC ---
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const sDate = new Date(sale.timestamp);
      sDate.setHours(0, 0, 0, 0); 
      if (startDate && sDate < new Date(startDate)) return false;
      if (endDate && sDate > new Date(endDate)) return false;
      if (filterMode !== 'ALL' && sale.paymentMethod !== filterMode) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const customer = customers.find(c => c.id === sale.customerId);
        const custStr = customer ? `${customer.name} ${customer.phone}`.toLowerCase() : '';
        if (!sale.id.toLowerCase().includes(query) && !custStr.includes(query)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); 
  }, [sales, customers, startDate, endDate, filterMode, searchQuery]);

  // --- KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    let totalSales = 0;
    let pendingUdhaar = 0;

    filteredSales.forEach(sale => {
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Online') {
        totalSales += sale.total;
      } else if (sale.split) {
        totalSales += (sale.split.cash + sale.split.online);
        pendingUdhaar += sale.split.udhaar;
      } else if (sale.paymentMethod === 'Udhaar') {
        pendingUdhaar += sale.total;
      }
    });

    const totalBills = filteredSales.length;
    const avgBill = totalBills > 0 ? (totalSales + pendingUdhaar) / totalBills : 0;

    return { totalSales, totalBills, avgBill, pendingUdhaar };
  }, [filteredSales]);

  // --- UDHAAR RESOLVER LOGIC ---
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingSale) return;

    const amountPaid = Number(settleAmount);
    const pendingAmount = settlingSale.split?.udhaar || settlingSale.total;

    if (amountPaid <= 0 || amountPaid > pendingAmount) {
      return alert(`Please enter a valid amount up to ${formatCurrency(pendingAmount)}`);
    }

    setIsSettling(true);

    try {
      // 1. Calculate new Invoice Split
      const currentCash = settlingSale.split?.cash || 0;
      const currentOnline = settlingSale.split?.online || 0;
      const newUdhaar = pendingAmount - amountPaid;
      const newCash = settleMode === 'Cash' ? currentCash + amountPaid : currentCash;
      const newOnline = settleMode === 'Online' ? currentOnline + amountPaid : currentOnline;

      let newPaymentMethod = settlingSale.paymentMethod;
      if (newUdhaar === 0) {
        newPaymentMethod = (newCash > 0 && newOnline > 0) ? 'Partial' : (newCash > 0 ? 'Cash' : 'Online');
      } else {
        newPaymentMethod = 'Partial';
      }

      const updatedSale: Sale = {
        ...settlingSale,
        paymentMethod: newPaymentMethod,
        isPaid: newUdhaar === 0,
        split: { cash: newCash, online: newOnline, udhaar: newUdhaar }
      };

      // 2. Update Global Customer Khata Balance
      if (settlingSale.customerId) {
        const customer = customers.find(c => c.id === settlingSale.customerId);
        if (customer) {
          await updateCustomer({
            ...customer,
            pendingUdhaar: Math.max(0, (customer.pendingUdhaar || 0) - amountPaid)
          });
        }
      }

      // 3. Push Sale Update to Firebase
      await updateSale(updatedSale);

      alert(`Successfully settled ${formatCurrency(amountPaid)}!`);
      setSettlingSale(null);
      setSettleAmount('');
    } catch (error) {
      console.error("Failed to settle udhaar:", error);
      alert("Database sync failed. Please check your connection.");
    } finally {
      setIsSettling(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice? This cannot be undone.")) {
      setSales(sales.filter(s => s.id !== id));
    }
  };

  const getBadgeStyle = (mode: string) => {
    switch (mode) {
      case 'Cash': return { bg: '#dcfce7', color: '#16a34a' };
      case 'Online': return { bg: '#f3e8ff', color: '#9333ea' };
      case 'Udhaar': return { bg: '#fee2e2', color: '#dc2626' };
      case 'Partial': return { bg: '#fef3c7', color: '#d97706' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header & KPIs remain exactly the same as your previous code... */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📒 Sales Ledger</h1>
        <Button variant="outline" style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 'bold' }}>
          ⬇️ Export to Excel
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card padding="1.5rem" style={{ borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Net Sales (Cash+Online)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#16a34a', fontFamily: 'monospace' }}>{formatCurrency(kpis.totalSales)}</div>
        </Card>
        <Card padding="1.5rem" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Invoices</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{kpis.totalBills}</div>
        </Card>
        <Card padding="1.5rem" style={{ borderLeft: '4px solid #9333ea' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Avg Ticket Size</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#9333ea', fontFamily: 'monospace' }}>{formatCurrency(kpis.avgBill)}</div>
        </Card>
        <Card padding="1.5rem" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Pending Udhaar</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#dc2626', fontFamily: 'monospace' }}>{formatCurrency(kpis.pendingUdhaar)}</div>
        </Card>
      </div>

      <Card padding="1rem" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 250px' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>TO</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} />
        </div>
        
        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ flex: '1 1 200px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'white' }}>
          <option value="ALL">All Payment Modes</option>
          <option value="Cash">Cash</option>
          <option value="Online">Online (UPI/Card)</option>
          <option value="Partial">Partial / Mixed</option>
          <option value="Udhaar">Udhaar (Pending)</option>
        </select>

        <input 
          type="text" 
          placeholder="Search Bill No, Customer, Phone..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '2 1 300px', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} 
        />
      </Card>

      {/* Sales Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {filteredSales.map(sale => {
          const badge = getBadgeStyle(sale.paymentMethod);
          const customer = customers.find(c => c.id === sale.customerId);
          const pendingUdhaar = sale.split?.udhaar || 0;

          return (
            <Card key={sale.id} padding="1rem" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', border: pendingUdhaar > 0 ? '1px solid #fca5a5' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{sale.id}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(sale.timestamp).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'monospace' }}>
                    {formatCurrency(sale.total)}
                  </div>
                  <span style={{ backgroundColor: badge.bg, color: badge.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {sale.paymentMethod}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  👤 {customer ? `${customer.name} (${customer.phone})` : 'Walk-in Customer'}
                </div>
                {pendingUdhaar > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 'bold', marginTop: '4px' }}>
                    Pending: {formatCurrency(pendingUdhaar)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                {/* NEW: Settle Udhaar Button */}
                {pendingUdhaar > 0 && (
                  <Button variant="primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={() => setSettlingSale(sale)}>
                    💰 Settle
                  </Button>
                )}
                
                <Button variant="outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => setViewingSale(sale)}>
                  📄 View
                </Button>
                <Button variant="outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: '#fca5a5' }} onClick={() => handleDelete(sale.id)}>
                  🗑️
                </Button>
              </div>
            </Card>
          );
        })}
        
        {filteredSales.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No sales records found matching your filters.
          </div>
        )}
      </div>

      {/* INVOICE MODAL */}
      <InvoiceModal isOpen={!!viewingSale} sale={viewingSale} onClose={() => setViewingSale(null)} />

      {/* SETTLE UDHAAR MODAL */}
      {settlingSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="2rem" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'white' }}>
            <h3 style={{ marginTop: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💰 Settle Pending Udhaar
            </h3>
            
            <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 'bold', textTransform: 'uppercase' }}>Amount Pending</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626', fontFamily: 'monospace' }}>
                {formatCurrency(settlingSale.split?.udhaar || 0)}
              </div>
            </div>

            <form onSubmit={handleSettleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Amount Being Paid Now</label>
                <input 
                  type="number" 
                  autoFocus
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder={`Max: ${settlingSale.split?.udhaar || 0}`}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '1.2rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Payment Mode</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setSettleMode('Cash')} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: settleMode === 'Cash' ? '2px solid #16a34a' : '1px solid var(--border)', backgroundColor: settleMode === 'Cash' ? '#dcfce7' : 'white', fontWeight: 'bold', color: settleMode === 'Cash' ? '#16a34a' : 'var(--text-main)', cursor: 'pointer' }}>
                    💵 Cash
                  </button>
                  <button type="button" onClick={() => setSettleMode('Online')} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: settleMode === 'Online' ? '2px solid #9333ea' : '1px solid var(--border)', backgroundColor: settleMode === 'Online' ? '#f3e8ff' : 'white', fontWeight: 'bold', color: settleMode === 'Online' ? '#9333ea' : 'var(--text-main)', cursor: 'pointer' }}>
                    📱 Online
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Button type="button" variant="outline" fullWidth onClick={() => { setSettlingSale(null); setSettleAmount(''); }}>Cancel</Button>
                <Button type="submit" variant="primary" fullWidth disabled={isSettling}>
                  {isSettling ? 'Saving...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};

export default Sales;