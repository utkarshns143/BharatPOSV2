import React, { useState, useMemo } from 'react';
import { useCustomerStore } from '../../../store/useCustomerStore';
import type { Sale } from '../../../types';

interface BillsTabProps {
  isActive: boolean;
  onOpenReceipt: (sale: Sale) => void;
}

export const BillsTab: React.FC<BillsTabProps> = ({ isActive, onOpenReceipt }) => {
  const { myBills, activeShopId, shopsMap } = useCustomerStore();
  const [billFilter, setBillFilter] = useState<'PENDING' | 'PAID'>('PENDING');

  const { pendingBills, paidBills, totalSpent, totalPending } = useMemo(() => {
    let tSpent = 0; let tPending = 0;
    const pBills: Sale[] = []; const resBills: Sale[] = [];
    
    // Fallback to empty array if myBills is undefined
    const safeBills = myBills || [];
    const filteredSales = activeShopId === 'ALL' ? safeBills : safeBills.filter(s => s._branchId === activeShopId);

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

  return (
    <main className={`tab-view ${isActive ? 'active' : ''}`} style={{ display: isActive ? 'block' : 'none' }}>
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
            <div key={b.id} className="bill-card" onClick={() => onOpenReceipt(b)}>
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
              {/* SAFELY MAPPING ITEMS */}
              <div className="bill-items">{b.items?.map((i: any) => `${i.qty}x ${i.name}`).join(', ') || 'No items listed'}</div>
            </div>
          ))
        )}
      </div>
    </main>
  );
};