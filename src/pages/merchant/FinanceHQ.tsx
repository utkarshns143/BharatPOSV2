import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import type { Expense } from '../../types';

export const FinanceHQ: React.FC = () => {
  const sales = useDataStore(state => state.sales);
  const expenses = useDataStore(state => state.expenses);
  const setExpenses = useDataStore(state => state.setExpenses);

  const [activeTab, setActiveTab] = useState<'expenses' | 'analytics'>('expenses');
  
  // Form State
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Stock/Inventory');
  const [expMode, setExpMode] = useState('Cash');
  const [expDesc, setExpDesc] = useState('');

  // Chart Refs
  const trendChartRef = useRef<any>(null);
  const pieChartRef = useRef<any>(null);

  // --- 1. KPI CALCULATIONS ---
  const kpis = useMemo(() => {
    // Money In: Cash + Online + Settled Udhaar Cash
    const moneyIn = sales.reduce((total, sale) => {
      if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Online') return total + sale.total;
      if (sale.split) return total + sale.split.cash + sale.split.online;
      return total;
    }, 0);

    // Money Out: Sum of all expenses
    const moneyOut = expenses.reduce((total, exp) => total + exp.amount, 0);

    return { moneyIn, moneyOut, balance: moneyIn - moneyOut };
  }, [sales, expenses]);

  // --- 2. EXPENSE ACTIONS ---
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return alert("Enter a valid amount");

    const newExpense: Expense = {
      id: `EXP-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: Number(expAmount),
      category: expCategory,
      mode: expMode,
      description: expDesc || 'No notes',
      timestamp: new Date().toISOString()
    };

    setExpenses([newExpense, ...expenses]);
    setExpAmount(''); setExpDesc(''); // Reset
    alert("Expense recorded successfully!");
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm("Delete this expense?")) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) return alert("No expenses to export.");
    const headers = ['Date', 'Expense ID', 'Category', 'Mode', 'Amount', 'Description'];
    const rows = expenses.map(e => [
new Date(e.timestamp || e.date || new Date().toISOString()).toLocaleDateString(), e.id, e.category, e.mode || 'Cash', e.amount, `"${e.description || e.note || ''}"`    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 3. CHART.JS ENGINE ---
  useEffect(() => {
    if (activeTab !== 'analytics') return;

    // Dynamically load Chart.js so you don't need npm packages
    const loadCharts = async () => {
      if (!(window as any).Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      renderCharts();
    };

    const renderCharts = () => {
      const Chart = (window as any).Chart;

      // Clean up old charts
      if (trendChartRef.current) trendChartRef.current.destroy();
      if (pieChartRef.current) pieChartRef.current.destroy();

      // 1. Process 30-Day Trend Data
      const days = [];
      const incomeData = [];
      const expenseData = [];
      
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
        
        // Sum daily income
        const dailyIncome = sales.reduce((sum, sale) => {
          const sDate = new Date(sale.timestamp);
          if (sDate.toDateString() === d.toDateString()) {
             if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Online') return sum + sale.total;
             if (sale.split) return sum + sale.split.cash + sale.split.online;
          }
          return sum;
        }, 0);
        incomeData.push(dailyIncome);

        // Sum daily expenses
        const dailyExpense = expenses.reduce((sum, exp) => {
const eDate = new Date(exp.timestamp || exp.date || new Date().toISOString());          if (eDate.toDateString() === d.toDateString()) return sum + exp.amount;
          return sum;
        }, 0);
        expenseData.push(dailyExpense);
      }

      // 2. Process Pie Chart Data (Group by Category)
      const categoryMap: Record<string, number> = {};
      expenses.forEach(e => {
        categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
      });

      // Draw Trend Chart
      const trendCtx = document.getElementById('trendChart') as HTMLCanvasElement;
      if (trendCtx) {
        trendChartRef.current = new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: days,
            datasets: [
              { label: 'Money In', data: incomeData, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.4 },
              { label: 'Money Out', data: expenseData, borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', fill: true, tension: 0.4 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
      }

      // Draw Pie Chart
      const pieCtx = document.getElementById('pieChart') as HTMLCanvasElement;
      if (pieCtx) {
        pieChartRef.current = new Chart(pieCtx, {
          type: 'doughnut',
          data: {
            labels: Object.keys(categoryMap),
            datasets: [{
              data: Object.values(categoryMap),
              backgroundColor: ['#6366f1', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#64748b']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
      }
    };

    loadCharts();
  }, [activeTab, sales, expenses]);

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Finance HQ</h1>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Manage expenses and view real-time profit & loss.</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card padding="20px" style={{ position: 'relative', overflow: 'hidden', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Current Balance <i className="fa-solid fa-wallet" style={{ color: 'var(--primary)', float: 'right' }}></i></div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{formatCurrency(kpis.balance)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Net available cash/bank</div>
        </Card>
        <Card padding="20px" style={{ position: 'relative', overflow: 'hidden', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Money In (Revenue) <i className="fa-solid fa-arrow-trend-up" style={{ color: 'var(--success)', float: 'right' }}></i></div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{formatCurrency(kpis.moneyIn)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Total sales collected</div>
        </Card>
        <Card padding="20px" style={{ position: 'relative', overflow: 'hidden', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Money Out (Expense) <i className="fa-solid fa-arrow-trend-down" style={{ color: 'var(--danger)', float: 'right' }}></i></div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{formatCurrency(kpis.moneyOut)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Total business expenses</div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1.5px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('expenses')} 
          style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: activeTab === 'expenses' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
        >
          Expense Book
        </button>
        <button 
          onClick={() => setActiveTab('analytics')} 
          style={{ padding: '12px 24px', background: 'transparent', border: 'none', borderBottom: activeTab === 'analytics' ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === 'analytics' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
        >
          P&L Analytics
        </button>
      </div>

      {/* TAB CONTENT: Expenses */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
          
          <Card padding="24px">
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px dashed var(--border)', paddingBottom: '15px' }}>
              <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#d97706' }}></i> Record Expense
            </h3>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount (₹)</label>
                  <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} required placeholder="0.00" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '18px', fontWeight: 800, color: 'var(--danger)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</label>
                  <select value={expCategory} onChange={e => setExpCategory(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', fontWeight: 600, outline: 'none' }}>
                      <option value="Stock/Inventory">Stock / Inventory Purchase</option>
                      <option value="Rent">Shop Rent</option>
                      <option value="Electricity/Utility">Electricity / Utilities</option>
                      <option value="Staff Salary">Staff Salary</option>
                      <option value="Marketing">Marketing / Ads</option>
                      <option value="Maintenance">Repair & Maintenance</option>
                      <option value="Other">Other Expenses</option>
                  </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Payment Mode</label>
                  <select value={expMode} onChange={e => setExpMode(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', fontWeight: 600, outline: 'none' }}>
                      <option value="Cash">Cash</option>
                      <option value="Bank/UPI">Bank / UPI</option>
                      <option value="Credit">Credit (To pay later)</option>
                  </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description / Notes</label>
                  <input type="text" value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="e.g. Paid to supplier ABC" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600, outline: 'none' }} />
              </div>
              <Button type="submit" variant="danger" style={{ marginTop: '10px', padding: '14px', background: 'linear-gradient(135deg, var(--danger), #b91c1c)' }}>
                <i className="fa-solid fa-minus"></i> Deduct from Balance
              </Button>
            </form>
          </Card>

          <Card padding="24px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1.5px dashed var(--border)', paddingBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-list"></i> Recent Expenses</h3>
                <Button variant="outline" onClick={handleExportCSV} style={{ padding: '6px 12px', fontSize: '12px' }}><i className="fa-solid fa-download"></i> CSV</Button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
              {expenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-money-bill-wave" style={{ fontSize: '40px', color: 'var(--border-hover)', marginBottom: '16px' }}></i>
                  <p style={{ fontWeight: 600 }}>No expenses recorded yet.</p>
                </div>
              ) : (
                expenses.map(exp => (
                  <div key={exp.id} style={{ background: '#f9f9f9', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.category}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px', display: 'flex', gap: '8px' }}>
<span>{new Date(exp.timestamp || exp.date || new Date().toISOString()).toLocaleDateString()}</span> • <span>{exp.mode || 'Cash'}</span>                      </div>
                      {exp.description && exp.description !== 'No notes' && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>"{exp.description}"</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, color: 'var(--danger)' }}>-{formatCurrency(exp.amount)}</span>
                      <button onClick={() => handleDeleteExpense(exp.id)} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.2)', color: 'var(--danger)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Analytics */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          <Card padding="24px" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px dashed var(--border)', paddingBottom: '15px' }}>
              <i className="fa-solid fa-chart-area" style={{ color: 'var(--primary)' }}></i> 30-Day Income vs Expense Trend
            </h3>
            <div style={{ position: 'relative', height: '320px', width: '100%' }}>
              <canvas id="trendChart"></canvas>
            </div>
          </Card>

          <Card padding="24px" style={{ gridColumn: '1 / -1', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1.5px dashed var(--border)', paddingBottom: '15px' }}>
              <i className="fa-solid fa-chart-pie" style={{ color: '#9333ea' }}></i> Expense Breakdown
            </h3>
            <div style={{ position: 'relative', height: '280px', width: '100%' }}>
              <canvas id="pieChart"></canvas>
            </div>
          </Card>

        </div>
      )}

    </div>
  );
};

export default FinanceHQ;