import React, { useState, useMemo } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

export const Khata: React.FC = () => {
  const customersStore = useDataStore(state => state.customers);
  const sales = useDataStore(state => state.sales);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VIP' | 'REGULAR' | 'RISK' | 'UDHAAR'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // --- 1. DYNAMIC CUSTOMER ENGINE ---
  // This analyzes all sales to compute live stats for every customer
  const enrichedCustomers = useMemo(() => {
    return customersStore.map(cust => {
      const custSales = sales.filter(s => s.customerId === cust.phone || s.customerId === cust.id);
      
      let totalSpent = 0;
      let pendingUdhaar = 0;
      let lastVisit = new Date(0);

      custSales.forEach(sale => {
        const saleDate = new Date(sale.timestamp);
        if (saleDate > lastVisit) lastVisit = saleDate;

        if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Online') {
          totalSpent += sale.total;
        } else if (sale.split) {
          totalSpent += (sale.split.cash + sale.split.online);
          pendingUdhaar += sale.split.udhaar;
        } else if (sale.paymentMethod === 'Udhaar') {
          pendingUdhaar += sale.total;
        }
      });

      const visitCount = custSales.length;
      const daysSinceLastVisit = visitCount > 0 ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 3600 * 24)) : 999;

      // AI Status Logic
      let status: 'VIP' | 'RISK' | 'REGULAR' = 'REGULAR';
      if (visitCount >= 5 || totalSpent >= 5000) status = 'VIP';
      else if (visitCount > 0 && daysSinceLastVisit > 30) status = 'RISK';

      return {
        ...cust,
        totalSpent,
        visitCount,
        pendingUdhaar,
        lastVisit: visitCount > 0 ? lastVisit.toISOString() : null,
        daysSinceLastVisit,
        status,
        salesHistory: custSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      };
    });
  }, [customersStore, sales]);

  // --- 2. FILTERING LOGIC ---
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(c => {
      // Search
      const searchStr = `${c.name} ${c.phone}`.toLowerCase();
      if (searchQuery && !searchStr.includes(searchQuery.toLowerCase())) return false;

      // Chips
      if (activeFilter === 'VIP' && c.status !== 'VIP') return false;
      if (activeFilter === 'REGULAR' && c.status !== 'REGULAR') return false;
      if (activeFilter === 'RISK' && c.status !== 'RISK') return false;
      if (activeFilter === 'UDHAAR' && c.pendingUdhaar <= 0) return false;

      return true;
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [enrichedCustomers, searchQuery, activeFilter]);

  // --- 3. KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    return {
      total: enrichedCustomers.length,
      vip: enrichedCustomers.filter(c => c.status === 'VIP').length,
      risk: enrichedCustomers.filter(c => c.status === 'RISK').length,
      ltv: enrichedCustomers.reduce((sum, c) => sum + c.totalSpent, 0)
    };
  }, [enrichedCustomers]);

  // --- 4. EXPORT TO CSV ---
  const handleExport = () => {
    if (filteredCustomers.length === 0) return alert("No data to export!");
    const headers = ['Name', 'Phone', 'Status', 'Total Spent', 'Visits', 'Pending Udhaar', 'Last Visit'];
    const rows = filteredCustomers.map(c => [
      c.name || 'Unknown', c.phone, c.status, c.totalSpent, c.visitCount, c.pendingUdhaar, c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : 'Never'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CRM_Customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for UI styling
  const getStatusStyles = (status: string) => {
    if (status === 'VIP') return { color: '#D97706', bg: '#FEF3C7', border: '#f59e0b', label: 'VIP Loyalty', icon: '👑' };
    if (status === 'RISK') return { color: '#dc2626', bg: '#fee2e2', border: '#ef4444', label: 'At-Risk', icon: '⚠️' };
    return { color: 'var(--primary)', bg: '#eff6ff', border: '#3b82f6', label: 'Regular', icon: '⭐' };
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header Card */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '16px', padding: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 10px 30px rgba(15,23,42,0.15)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#cbd5e1' }}>👥</span> Bharat CRM & Khata
          </h1>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold' }}>Manage customer loyalty, identify churn risks, and track Udhaar.</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={handleExport} style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white', background: 'transparent' }}>
            📥 Export List
          </Button>
          <button onClick={() => alert("AI SMS Campaigns coming soon!")} style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(139,92,246,0.3)' }}>
            ✨ AI Re-Targeting
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#eff6ff', color: 'var(--primary)', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👥</div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Customers</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{kpis.total}</div>
          </div>
        </Card>
        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#FEF3C7', color: '#D97706', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👑</div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>VIP Customers</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#D97706' }}>{kpis.vip}</div>
          </div>
        </Card>
        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚠️</div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>At-Risk (Churn)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{kpis.risk}</div>
          </div>
        </Card>
        <Card padding="1.5rem" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💰</div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Lifetime Value</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', fontFamily: 'monospace' }}>{formatCurrency(kpis.ltv)}</div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', flex: 1, minWidth: '300px' }}>
          {[
            { id: 'ALL', label: 'All Customers' },
            { id: 'VIP', label: '👑 VIP Loyalty' },
            { id: 'REGULAR', label: '⭐ Regulars' },
            { id: 'RISK', label: '⚠️ At-Risk' },
            { id: 'UDHAAR', label: '📕 Has Udhaar' }
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1.5px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                backgroundColor: activeFilter === f.id ? 'var(--primary)' : 'white',
                color: activeFilter === f.id ? 'white' : 'var(--text-muted)',
                borderColor: activeFilter === f.id ? 'var(--primary)' : 'var(--border)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <input 
          type="text" 
          placeholder="Search name or phone..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '1 1 250px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontWeight: 'bold' }} 
        />
      </div>

      {/* Customer Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filteredCustomers.map(cust => {
          const s = getStatusStyles(cust.status);
          return (
            <Card 
              key={cust.id} 
              padding="1rem" 
              onClick={() => setSelectedCustomer(cust)}
              style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', borderLeft: `4px solid ${s.border}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {cust.name ? cust.name.charAt(0).toUpperCase() : '👤'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                      {cust.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{cust.phone}</div>
                  </div>
                </div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: s.bg, color: s.color }}>
                  {s.label}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Last Visit</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {cust.lastVisit ? new Date(cust.lastVisit).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Spent</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'monospace' }}>
                    {formatCurrency(cust.totalSpent)}
                  </span>
                </div>
              </div>

              {cust.pendingUdhaar > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--danger)' }}>
                  <span>Pending Udhaar:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{formatCurrency(cust.pendingUdhaar)}</span>
                </div>
              )}
            </Card>
          );
        })}
        {filteredCustomers.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            No customers found matching your criteria.
          </div>
        )}
      </div>

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <Card padding="1.5rem" style={{ width: '100%', maxWidth: '450px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ visibility: 'hidden' }}>X</div>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1.5px dashed var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#e0e7ff', color: 'var(--primary)', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 'bold' }}>
                  {selectedCustomer.name ? selectedCustomer.name.charAt(0).toUpperCase() : '👤'}
                </div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{selectedCustomer.name || 'Unknown Customer'}</h2>
                <div style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '13px' }}>{selectedCustomer.phone}</div>
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', backgroundColor: getStatusStyles(selectedCustomer.status).bg, color: getStatusStyles(selectedCustomer.status).color }}>
                    {getStatusStyles(selectedCustomer.status).icon} {getStatusStyles(selectedCustomer.status).label}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Total Spent</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'monospace' }}>{formatCurrency(selectedCustomer.totalSpent)}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Store Visits</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: 'monospace' }}>{selectedCustomer.visitCount}</div>
                </div>
              </div>

              {selectedCustomer.pendingUdhaar > 0 && (
                <div style={{ background: '#fee2e2', border: '1.5px solid rgba(220,38,38,0.2)', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--danger)', textTransform: 'uppercase' }}>Pending Udhaar</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-main)', opacity: 0.8, fontWeight: 'bold', marginTop: '2px' }}>Clear this in Sales Ledger</div>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--danger)', fontFamily: 'monospace' }}>{formatCurrency(selectedCustomer.pendingUdhaar)}</div>
                </div>
              )}

              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Purchase History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedCustomer.salesHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '10px' }}>No purchases yet.</div>
                ) : (
                  selectedCustomer.salesHistory.map((sale: any) => (
                    <div key={sale.id} style={{ background: 'white', border: '1px solid var(--border)', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{new Date(sale.timestamp).toLocaleDateString()}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '2px' }}>{sale.id} • {sale.paymentMethod}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>{formatCurrency(sale.total)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => window.open(`https://wa.me/91${selectedCustomer.phone}?text=Hello ${selectedCustomer.name || ''}, greeting from BharatPOS!`, '_blank')}
              style={{ width: '100%', marginTop: '20px', borderColor: '#22c55e', color: '#22c55e', fontWeight: 'bold' }}
            >
              💬 Send WhatsApp Message
            </Button>
          </Card>
        </div>
      )}

    </div>
  );
};

export default Khata;