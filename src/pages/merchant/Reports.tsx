import React, { useState, useMemo } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

interface DailyStat {
  dateStr: string;
  dateObj: Date;
  bills: number;
  itemsSold: number;
  gross: number;
  net: number;
  gst: number;
  products: Record<string, number>;
}

export const Reports: React.FC = () => {
  const sales = useDataStore(state => state.sales);
  const products = useDataStore(state => state.products);

  // Filters & UI State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // --- 1. CORE AGGREGATION ENGINE ---
  const { list: dailyReports, maxNet } = useMemo(() => {
    const stats: Record<string, DailyStat> = {};
    let localMaxNet = 1; // Prevent div by zero

    sales.forEach(sale => {
      const d = new Date(sale.timestamp);
      d.setHours(0, 0, 0, 0);
      
      if (startDate && d < new Date(startDate)) return;
      if (endDate && d > new Date(endDate)) return;

      const dateStr = d.toISOString().split('T')[0];
      if (!stats[dateStr]) {
        stats[dateStr] = { dateStr, dateObj: d, bills: 0, itemsSold: 0, gross: 0, net: 0, gst: 0, products: {} };
      }

      const day = stats[dateStr];
      day.bills += 1;
      day.gross += sale.total;

      // Calculate Net (Cash + Online only)
      let saleNet = 0;
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Online') saleNet = sale.total;
      else if (sale.split) saleNet = sale.split.cash + sale.split.online;
      day.net += saleNet;

      // Calculate Items & GST
      sale.items.forEach(item => {
        day.itemsSold += item.qty;
        
        // Group for the expandable detail row
        const prodKey = `${item.name} (${item.variantName})`;
        day.products[prodKey] = (day.products[prodKey] || 0) + item.qty;

        // Estimate GST based on current catalog
        const catalogProd = products.find(p => p.id === item.prodId);
        if (catalogProd && catalogProd.gstRate) {
          const rate = Number(catalogProd.gstRate);
          if (catalogProd.priceType === 'exclusive') {
             day.gst += item.total * (rate / 100);
          } else {
             // Inclusive tax formula: Price - (Price / (1 + Rate%))
             day.gst += item.total - (item.total / (1 + rate / 100));
          }
        }
      });

      if (day.net > localMaxNet) localMaxNet = day.net;
    });

    // Sort newest to oldest
    const sortedList = Object.values(stats).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    return { list: sortedList, maxNet: localMaxNet };
  }, [sales, products, startDate, endDate]);

  // --- 2. KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    return dailyReports.reduce((acc, day) => {
      acc.net += day.net;
      acc.gst += day.gst;
      acc.gross += day.gross;
      acc.bills += day.bills;
      return acc;
    }, { net: 0, gst: 0, gross: 0, bills: 0 });
  }, [dailyReports]);

  // --- 3. EXPORT CAPABILITIES ---
  const handleExportExcel = () => {
    if (dailyReports.length === 0) return alert("No data to export!");
    const headers = ['Date', 'Total Bills', 'Items Sold', 'Gross Sales', 'GST Collected', 'Net Collected'];
    const rows = dailyReports.map(d => [
      d.dateObj.toLocaleDateString(), d.bills, d.itemsSold, d.gross.toFixed(2), d.gst.toFixed(2), d.net.toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `BharatPOS_Daily_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    window.print(); // Uses browser's native PDF generator
    setShowExportModal(false);
  };

  // Inline dynamic styles based on compact mode
  const tdStyle: React.CSSProperties = { padding: isCompact ? '10px 12px' : '16px 20px', borderBottom: '1px solid #e0e7ef', fontSize: isCompact ? '12px' : '14px', fontWeight: 600, color: 'var(--text-main)' };
  const thStyle: React.CSSProperties = { padding: isCompact ? '10px 12px' : '16px 20px', borderBottom: '1.5px solid var(--border)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 };

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }} className="print-area">
      
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card padding={isCompact ? "1rem" : "1.5rem"} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Net Collected <i className="fa-solid fa-money-bill-wave" style={{ color: 'var(--success)', float: 'right' }}></i></div>
          <div style={{ fontSize: isCompact ? '20px' : '28px', fontWeight: 800, fontFamily: 'monospace', marginTop: '10px', color: 'var(--text-main)' }}>{formatCurrency(kpis.net)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Cash + Online Only</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: 'var(--success)' }}></div>
        </Card>
        <Card padding={isCompact ? "1rem" : "1.5rem"} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total GST <i className="fa-solid fa-receipt" style={{ color: 'var(--warning)', float: 'right' }}></i></div>
          <div style={{ fontSize: isCompact ? '20px' : '28px', fontWeight: 800, fontFamily: 'monospace', marginTop: '10px', color: 'var(--text-main)' }}>{formatCurrency(kpis.gst)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Estimated Tax Coll.</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: 'var(--warning)' }}></div>
        </Card>
        <Card padding={isCompact ? "1rem" : "1.5rem"} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Gross Sales <i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)', float: 'right' }}></i></div>
          <div style={{ fontSize: isCompact ? '20px' : '28px', fontWeight: 800, fontFamily: 'monospace', marginTop: '10px', color: 'var(--text-main)' }}>{formatCurrency(kpis.gross)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>Includes Pending Udhaar</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: 'var(--primary)' }}></div>
        </Card>
        <Card padding={isCompact ? "1rem" : "1.5rem"} style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Bills <i className="fa-solid fa-hashtag" style={{ color: 'var(--purple)', float: 'right' }}></i></div>
          <div style={{ fontSize: isCompact ? '20px' : '28px', fontWeight: 800, marginTop: '10px', color: 'var(--text-main)' }}>{kpis.bills}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600 }}>In selected period</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', backgroundColor: 'var(--purple)' }}></div>
        </Card>
      </div>

      {/* Main Report Table Area */}
      <Card padding="0" style={{ overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: isCompact ? '12px 16px' : '20px 24px', backgroundColor: '#f9f9f9', borderBottom: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: isCompact ? '14px' : '16px', fontWeight: 800 }}>📊 Daily Aggregates</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontWeight: 700 }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>TO</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontWeight: 700 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" onClick={() => setIsCompact(!isCompact)} title="Toggle Compact View" style={{ padding: '8px 12px' }}>
              <i className={`fa-solid ${isCompact ? 'fa-expand' : 'fa-compress'}`}></i>
            </Button>
            <Button variant="primary" onClick={() => setShowExportModal(true)} style={{ padding: '8px 16px' }}>
              <i className="fa-solid fa-download"></i> Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Bills</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Items Sold</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Gross Sales</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>GST Coll.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Collected</th>
              </tr>
            </thead>
            <tbody>
              {dailyReports.map((day) => (
                <React.Fragment key={day.dateStr}>
                  {/* Summary Row */}
                  <tr 
                    style={{ cursor: 'pointer', backgroundColor: expandedDate === day.dateStr ? 'var(--bg-input)' : 'white', transition: 'background 0.2s' }}
                    onClick={() => setExpandedDate(expandedDate === day.dateStr ? null : day.dateStr)}
                  >
                    <td style={tdStyle}>
                      <i className={`fa-solid fa-chevron-${expandedDate === day.dateStr ? 'down' : 'right'}`} style={{ color: 'var(--primary)', marginRight: '8px', fontSize: '10px' }}></i>
                      {day.dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{day.bills}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{day.itemsSold}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(day.gross)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--warning)' }}>{formatCurrency(day.gst)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', position: 'relative' }}>
                      <div style={{ position: 'absolute', right: 0, top: '15%', height: '70%', width: `${(day.net / maxNet) * 100}%`, backgroundColor: 'var(--border)', opacity: 0.6, borderRadius: '4px 0 0 4px', zIndex: 0 }}></div>
                      <span style={{ position: 'relative', zIndex: 1, fontFamily: 'monospace', color: 'var(--success)', fontWeight: 800 }}>{formatCurrency(day.net)}</span>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {expandedDate === day.dateStr && (
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div style={{ padding: isCompact ? '12px' : '20px', borderLeft: '4px solid var(--primary)', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Items Sold on this Day:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {Object.entries(day.products).map(([name, qty]) => (
                              <div key={name} style={{ backgroundColor: 'white', border: '1.5px solid var(--border)', padding: isCompact ? '5px 10px' : '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
                                {name} <span style={{ backgroundColor: 'var(--bg-input)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>x{qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {dailyReports.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No sales found in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1.5px dashed var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>📥 Export Reports</h3>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', fontWeight: 600 }}>
              Export your aggregated daily summaries. The date range selected on the main screen will be applied.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Button variant="primary" onClick={handleExportExcel} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
                <i className="fa-solid fa-file-excel"></i> Excel (CSV)
              </Button>
              <Button variant="danger" onClick={handleExportPDF} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none' }}>
                <i className="fa-solid fa-file-pdf"></i> Print / PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;