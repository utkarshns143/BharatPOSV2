import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/useDataStore';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../utils/formatters';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Connect to global offline database
  const sales = useDataStore(state => state.sales);
  const products = useDataStore(state => state.products);
  const customers = useDataStore(state => state.customers);

  // Dashboard State
  const [timeFilter, setTimeFilter] = useState<'today' | 'month' | 'all'>('today');

  // --- 1. CORE DATA FILTERING ---
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter(sale => {
      const saleTime = new Date(sale.timestamp).getTime();
      if (timeFilter === 'today') return saleTime >= startOfToday;
      if (timeFilter === 'month') return saleTime >= startOfMonth;
      return true; // 'all'
    });
  }, [sales, timeFilter]);

  // --- 2. KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    let revenue = 0;
    let itemsSold = 0;
    let pendingUdhaar = 0;

    filteredSales.forEach(sale => {
      // Calculate Revenue (Cash + Online)
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Online') {
        revenue += sale.total;
      } else if (sale.split) {
        revenue += (sale.split.cash + sale.split.online);
      }

      // Calculate Items Sold
      itemsSold += sale.items.reduce((sum, item) => sum + item.qty, 0);
    });

    // Udhaar is strictly calculated globally (All Time) to match market dues, 
    // or we can calculate just the Udhaar given in this period. We'll do period-based for the KPI:
    filteredSales.forEach(sale => {
      if (sale.paymentMethod === 'Udhaar') pendingUdhaar += sale.total;
      else if (sale.split?.udhaar) pendingUdhaar += sale.split.udhaar;
    });

    return { revenue, bills: filteredSales.length, itemsSold, pendingUdhaar };
  }, [filteredSales]);

  // --- 3. 7-DAY SALES CHART GENERATOR ---
  const chartData = useMemo(() => {
    const days = [];
    let maxDaily = 0;
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      
      // Sum sales for this specific day
      const dayTotal = sales.reduce((sum, sale) => {
        const sDate = new Date(sale.timestamp);
        sDate.setHours(0,0,0,0);
        if (sDate.getTime() === d.getTime()) return sum + sale.total;
        return sum;
      }, 0);

      if (dayTotal > maxDaily) maxDaily = dayTotal;
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), total: dayTotal });
    }
    return { days, maxDaily: maxDaily || 1 }; // Prevent division by zero
  }, [sales]);

  // --- 4. LOW STOCK ALERTS ---
  const lowStockItems = useMemo(() => {
    const alerts: { name: string, variant: string, stock: number, alert: number }[] = [];
    products.forEach(p => {
      p.variants.forEach(v => {
        if (v.stock <= (p.reorderPoint || 0)) {
          alerts.push({ name: p.name, variant: v.quantity, stock: v.stock, alert: p.reorderPoint });
        }
      });
    });
    return alerts;
  }, [products]);

  // --- 5. UDHAAR (PENDING DUES) ---
  const topUdhaar = useMemo(() => {
    // We calculate total unpaid dues per customer across all time
    const duesMap: Record<string, number> = {};
    sales.forEach(sale => {
      if (sale.customerId && sale.split && sale.split.udhaar > 0) {
        duesMap[sale.customerId] = (duesMap[sale.customerId] || 0) + sale.split.udhaar;
      } else if (sale.customerId && sale.paymentMethod === 'Udhaar') {
        duesMap[sale.customerId] = (duesMap[sale.customerId] || 0) + sale.total;
      }
    });

    return Object.entries(duesMap)
      .map(([customerId, amount]) => {
        const cust = customers.find(c => c.id === customerId);
        return { name: cust?.name || 'Unknown', phone: cust?.phone || customerId, amount };
      })
      .filter(u => u.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Show top 5
  }, [sales, customers]);

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box', backgroundColor: '#f4f7fb', minHeight: '100vh' }}>
      
      {/* Header & Date Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Main Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontWeight: 'bold' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <select 
          value={timeFilter} 
          onChange={e => setTimeFilter(e.target.value as any)}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)', outline: 'none' }}
        >
          <option value="today">📅 Today</option>
          <option value="month">📅 This Month</option>
          <option value="all">📅 All Time</option>
        </select>
      </div>

      {/* Giant POS Button */}
      <button 
        onClick={() => navigate('/pos')}
        style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', border: 'none', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 6px 20px rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}
      >
        🖥️ Naya Bill Banao (Create Bill)
      </button>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💰</div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Kamai (Earnings)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{formatCurrency(kpis.revenue)}</div>
          </div>
        </Card>
        
        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#e0e7ff', color: 'var(--primary)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🧾</div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Parchiyan (Bills)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{kpis.bills}</div>
          </div>
        </Card>

        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#f3e8ff', color: '#9333ea', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📦</div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Samaan Bika (Items)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{kpis.itemsSold}</div>
          </div>
        </Card>

        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #fecaca', backgroundColor: '#fff5f5' }}>
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📘</div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 'bold', textTransform: 'uppercase' }}>Baki Udhaar (Dues)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(kpis.pendingUdhaar)}</div>
          </div>
        </Card>
      </div>

      {/* Widgets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Quick Actions */}
        <Card padding="1.5rem" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>⚡ Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            <button onClick={() => navigate('/inventory')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: '#e0e7ff', color: 'var(--primary)', padding: '6px', borderRadius: '6px' }}>📦</span> Manage Inventory
            </button>
            <button onClick={() => navigate('/sales')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '6px', borderRadius: '6px' }}>📖</span> Sales Ledger
            </button>
            <button onClick={() => navigate('/khata')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: '#f3e8ff', color: '#9333ea', padding: '6px', borderRadius: '6px' }}>👥</span> CRM & Khata
            </button>
          </div>
        </Card>

        {/* 7-Day Sales Trend (CSS Chart) */}
        <Card padding="1.5rem">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>📈 7-Day Sales Trend</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', paddingTop: '10px', borderBottom: '1.5px solid var(--border)' }}>
            {chartData.days.map((day, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: 1, height: '100%' }}>
                {/* Tooltip & Bar */}
                <div style={{ width: '60%', backgroundColor: 'var(--primary)', borderRadius: '4px 4px 0 0', height: `${(day.total / chartData.maxDaily) * 100}%`, minHeight: '4px', position: 'relative' }} title={formatCurrency(day.total)}></div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{day.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card padding="1.5rem" style={{ display: 'flex', flexDirection: 'column', maxHeight: '350px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>⚠️ Low Stock (Maal Mangwayein)</h3>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
            {lowStockItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>All stock levels are healthy! 🎉</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lowStockItems.map((item, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.variant}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{item.stock} left</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Alert at {item.alert}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Pending Udhaar List */}
        <Card padding="1.5rem" style={{ display: 'flex', flexDirection: 'column', maxHeight: '350px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>📕 Top Pending Udhaar</h3>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
            {topUdhaar.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No pending market dues! 🎉</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {topUdhaar.map((u, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', backgroundColor: '#fff', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📞 {u.phone}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                      {formatCurrency(u.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;