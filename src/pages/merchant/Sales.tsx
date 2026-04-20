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

  // Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  // --- FILTERING LOGIC ---
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // 1. Date Filter
      const sDate = new Date(sale.timestamp);
      sDate.setHours(0, 0, 0, 0); // Normalize time
      if (startDate && sDate < new Date(startDate)) return false;
      if (endDate && sDate > new Date(endDate)) return false;

      // 2. Mode Filter
      if (filterMode !== 'ALL' && sale.paymentMethod !== filterMode) return false;

      // 3. Search Filter (Bill ID, Customer Name, or Phone)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const customer = customers.find(c => c.id === sale.customerId);
        const custStr = customer ? `${customer.name} ${customer.phone}`.toLowerCase() : '';
        
        if (!sale.id.toLowerCase().includes(query) && !custStr.includes(query)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Newest first
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

  // --- EXPORT TO EXCEL (CSV) ---
  const handleExportExcel = () => {
    if (filteredSales.length === 0) return alert("No data to export!");

    const headers = ['Date', 'Bill No', 'Customer', 'Phone', 'Total Amount', 'Payment Mode', 'Cash Paid', 'Online Paid', 'Udhaar'];
    const rows = filteredSales.map(s => {
      const cust = customers.find(c => c.id === s.customerId);
      return [
        new Date(s.timestamp).toLocaleString(),
        s.id,
        cust?.name || 'Walk-in',
        cust?.phone || '-',
        s.total,
        s.paymentMethod,
        s.split?.cash || (s.paymentMethod === 'Cash' ? s.total : 0),
        s.split?.online || (s.paymentMethod === 'Online' ? s.total : 0),
        s.split?.udhaar || (s.paymentMethod === 'Udhaar' ? s.total : 0)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice? This cannot be undone.")) {
      setSales(sales.filter(s => s.id !== id));
    }
  };

  // Helper for Payment Badges
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
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>📖 Sales Ledger</h1>
        <Button variant="outline" onClick={handleExportExcel} style={{ borderColor: '#10b981', color: '#10b981', fontWeight: 'bold' }}>
          📊 Export to Excel
        </Button>
      </div>

      {/* KPI Grid */}
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

      {/* Filter Bar */}
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

          return (
            <Card key={sale.id} padding="1rem" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {sale.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <Button variant="outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => setViewingSale(sale)}>
                  👁️ View Receipt
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

      <InvoiceModal 
        isOpen={!!viewingSale} 
        sale={viewingSale} 
        onClose={() => setViewingSale(null)} 
      />

    </div>
  );
};

export default Sales;