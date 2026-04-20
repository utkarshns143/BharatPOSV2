import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const Forecast: React.FC = () => {
  const sales = useDataStore(state => state.sales);
  const products = useDataStore(state => state.products);
  const setProducts = useDataStore(state => state.setProducts);

  // State
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecastData, setForecastData] = useState<any | null>(null);
  
  const chartRef = useRef<any>(null);

  // Flatten products into selectable variants (SKUs)
  const availableSkus = useMemo(() => {
    const skus: { id: string, prodId: string, variantId: string, name: string, stock: number }[] = [];
    products.forEach(p => {
      p.variants.forEach(v => {
        skus.push({
          id: `${p.id}|${v.id}`,
          prodId: p.id,
          variantId: v.id,
          name: `${p.name} (${v.quantity})`,
          stock: v.stock
        });
      });
    });
    return skus.sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // AI Prediction Engine
  const runForecast = () => {
    if (!selectedSku) return alert("Please select a product first.");
    
    setIsAnalyzing(true);
    const skuParts = selectedSku.split('|');
    const prodId = skuParts[0];
    const variantId = skuParts[1];
    const skuInfo = availableSkus.find(s => s.id === selectedSku);

    setTimeout(() => {
      const now = new Date();
      const histData: number[] = [];
      const labels: string[] = [];
      
      let total30 = 0;
      let total7 = 0;

      // 1. Calculate Actual Historical Data (Last 30 Days)
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Count total qty of this specific product sold on this day
        const daySales = sales.reduce((sum, sale) => {
          const sDate = new Date(sale.timestamp);
          if (sDate.toDateString() === d.toDateString()) {
            const qtyInSale = sale.items
              .filter(item => item.prodId === prodId && item.variantId === variantId)
              .reduce((acc, item) => acc + item.qty, 0); // Safely sum qty
            return sum + qtyInSale;
          }
          return sum;
        }, 0);
        
        histData.push(daySales);
        total30 += daySales;
        if (i < 7) total7 += daySales;
      }

      // 2. Trend Analysis Algorithm
      const futureData: (number | null)[] = new Array(30).fill(null);
      futureData[29] = histData[29]; // Connect the graph lines perfectly
      
      let predictedTotal = 0;
      let status = 'NORMAL';
      let reason = '';
      let needsRestock = false;
      const currentStock = skuInfo?.stock || 0;

      if (total30 === 0) {
        // FIXED: Zero Sales Logic
        for (let i = 1; i <= 7; i++) {
          futureData.push(0);
          labels.push(new Date(now.getTime() + i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        reason = `Not enough data. You have 0 sales for this item in the last 30 days. We cannot predict future demand until you start selling it.`;
        status = 'NORMAL';

      } else {
        // Active Sales Logic
        const avg30 = total30 / 30;
        const avg7 = total7 / 7;
        const momentum = avg30 > 0 ? (avg7 / avg30) : 1; 
        const baseDaily = (avg7 > 0 ? avg7 : avg30) * momentum;

        for (let i = 1; i <= 7; i++) {
          const d = new Date();
          d.setDate(now.getDate() + i);
          labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          
          const variance = baseDaily * (0.8 + Math.random() * 0.4);
          const prediction = Math.round(variance);
          futureData.push(prediction);
          predictedTotal += prediction;
        }

        reason = `Based on a 30-day velocity of ${total30} units and recent momentum, we expect a steady demand of ~${predictedTotal} units over the next week.`;
        
        if (currentStock < predictedTotal) {
          status = 'DANGER';
          reason = `CRITICAL SHORTAGE: Demand is trending up! We predict you need ${predictedTotal} units but only have ${currentStock}. Please restock immediately.`;
          needsRestock = true;
        } else if (currentStock < predictedTotal * 1.5) {
          status = 'WARNING';
          reason = `LOW BUFFER: You have enough stock for the predicted 7-day demand (${predictedTotal} units), but your safety buffer is low. Consider restocking soon.`;
        } else {
          reason += ` Your current stock is healthy.`;
        }
      }

      setForecastData({
        labels,
        histData,
        futureData,
        currentStock,
        predictedTotal,
        status,
        reason,
        needsRestock,
        skuName: skuInfo?.name
      });
      
      setIsAnalyzing(false);
      renderChart(labels, histData, futureData);
    }, 600); // UI Polish: Small delay to simulate AI processing
  };

  // Chart Rendering
  const renderChart = (labels: string[], histData: number[], futureData: (number|null)[]) => {
    const Chart = (window as any).Chart;
    if (!Chart) return;

    if (chartRef.current) chartRef.current.destroy();

    const ctx = document.getElementById('forecastChart') as HTMLCanvasElement;
    if (ctx) {
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Historical Sales (30 Days)',
              data: histData,
              borderColor: '#64748b',
              backgroundColor: 'rgba(100, 116, 139, 0.1)',
              fill: true,
              tension: 0.3
            },
            {
              label: 'AI Forecast (Next 7 Days)',
              data: futureData,
              borderColor: '#8b5cf6',
              borderDash: [5, 5],
              backgroundColor: 'transparent',
              tension: 0.3,
              pointBackgroundColor: '#8b5cf6',
              pointRadius: 4
            }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  };

  // Auto-Restock Logic
  const handleRestock = () => {
    if (!forecastData || !selectedSku) return;
    
    const suggestedRestock = Math.ceil(forecastData.predictedTotal * 1.5) - forecastData.currentStock;
    const amountToOrder = suggestedRestock > 0 ? suggestedRestock : 10; 

    if (window.confirm(`Auto-fill inventory by adding ${amountToOrder} units to ${forecastData.skuName}?`)) {
      const skuParts = selectedSku.split('|');
      
      const updatedProducts = products.map(p => {
        if (p.id === skuParts[0]) {
          return {
            ...p,
            variants: p.variants.map(v => 
              v.id === skuParts[1] ? { ...v, stock: v.stock + amountToOrder } : v
            )
          };
        }
        return p;
      });

      setProducts(updatedProducts);
      alert(`Successfully added ${amountToOrder} units to inventory!`);
      
      setForecastData({ ...forecastData, currentStock: forecastData.currentStock + amountToOrder, needsRestock: false, status: 'NORMAL', reason: 'Stock replenished successfully. Levels are now healthy.' });
    }
  };

  // Load Chart.js script on mount
  useEffect(() => {
    if (!(window as any).Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      document.body.appendChild(script);
    }
  }, []);

  const getStatusStyles = (status: string) => {
    if (status === 'DANGER') return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca', label: 'CRITICAL SHORTAGE' };
    if (status === 'WARNING') return { bg: '#FEF3C7', color: '#D97706', border: '#fde68a', label: 'LOW BUFFER' };
    return { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0', label: 'HEALTHY STOCK' };
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      
      <Card padding="24px" style={{ borderTop: '4px solid #8b5cf6' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '15px', borderBottom: '1.5px dashed var(--border)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: '#f3e8ff', color: '#8b5cf6' }}>
                <i className="fa-solid fa-brain"></i>
            </div>
            <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800 }}>DemandMitra AI Forecaster</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Select a product to analyze its 30-day historical velocity and predict the next 7 days of demand.</p>
            </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Product to Analyze</label>
                <select 
                  value={selectedSku} 
                  onChange={e => setSelectedSku(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', fontWeight: 700, outline: 'none', background: '#f9f9f9' }}
                >
                    <option value="">Select an item from inventory...</option>
                    {availableSkus.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (In Stock: {s.stock})</option>
                    ))}
                </select>
            </div>
            <Button 
              variant="primary" 
              onClick={runForecast} 
              disabled={isAnalyzing || !selectedSku}
              style={{ padding: '12px 24px', minWidth: '140px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }}
            >
                {isAnalyzing ? 'Analyzing Data...' : <><i className="fa-solid fa-wand-magic-sparkles"></i> Run AI Forecast</>}
            </Button>
        </div>

        {/* Chart Area */}
        <div style={{ position: 'relative', height: '350px', width: '100%', marginBottom: '24px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid var(--border)', padding: '10px', boxSizing: 'border-box' }}>
            {!forecastData && !isAnalyzing && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-chart-area" style={{ fontSize: '40px', opacity: 0.2, marginBottom: '10px' }}></i>
                    <p style={{ fontWeight: 600 }}>Chart will appear here after analysis.</p>
                </div>
            )}
            <canvas id="forecastChart" style={{ display: forecastData ? 'block' : 'none' }}></canvas>
        </div>

        {/* AI Insight Box */}
        {forecastData && (
          <div style={{ background: getStatusStyles(forecastData.status).bg, border: `1.5px solid ${getStatusStyles(forecastData.status).border}`, borderRadius: '16px', padding: '24px', animation: 'fadeIn 0.4s ease-out' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 800, padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '1px', background: 'white', color: getStatusStyles(forecastData.status).color, boxShadow: 'var(--shadow-sm)' }}>
                      {getStatusStyles(forecastData.status).label}
                  </div>
              </div>
              
              <div style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.6, fontWeight: 600, marginBottom: '20px' }}>
                  {forecastData.reason}
              </div>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ background: 'white', border: '1.5px solid var(--border)', padding: '12px 16px', borderRadius: '10px', flex: 1, minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Current Stock</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{forecastData.currentStock}</div>
                  </div>
                  <div style={{ background: 'white', border: '1.5px solid var(--border)', padding: '12px 16px', borderRadius: '10px', flex: 1, minWidth: '120px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Predicted 7-Day Demand</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#8b5cf6', fontFamily: 'monospace' }}>{forecastData.predictedTotal}</div>
                  </div>
              </div>

              {forecastData.needsRestock && (
                  <Button 
                    onClick={handleRestock}
                    style={{ background: 'linear-gradient(135deg, var(--danger), #b91c1c)', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 800, fontSize: '14px', width: '100%', textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(220,38,38,0.3)' }}
                  >
                      <i className="fa-solid fa-cart-plus"></i> 1-Click Auto-Fill Inventory
                  </Button>
              )}
          </div>
        )}

      </Card>
    </div>
  );
};

export default Forecast;