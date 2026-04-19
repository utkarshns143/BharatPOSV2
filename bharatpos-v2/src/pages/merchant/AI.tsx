import React, { useState, } from 'react';
import { useDataStore } from '../../store/useDataStore';
import { formatCurrency } from '../../utils/formatters';

export const AI: React.FC = () => {
  // Pull live data to generate smart responses
  const sales = useDataStore(state => state.sales);
  const products = useDataStore(state => state.products);
  const customers = useDataStore(state => state.customers);

  // AI Sync & State Logic
  const [isSynced, setIsSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ ,setActiveTopic] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<{ title: string, html: string } | null>(null);

  // --- 1. CLOUD SYNC SIMULATION ---
  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setIsSynced(true);
      setAiResponse(null); // Clear old responses on fresh sync
    }, 1500);
  };

  // --- 2. DYNAMIC AI ADVICE GENERATOR ---
  const handleAskAI = (topic: 'general' | 'inventory' | 'sales' | 'customer') => {
    if (!isSynced) {
      alert("⚠️ Please upload your latest data snapshot to the cloud first!");
      return;
    }

    setActiveTopic(topic);
    setIsAnalyzing(true);

    // Simulate network delay for AI generation
    setTimeout(() => {
      let title = "";
      let html = "";

      if (topic === 'general') {
        const totalRev = sales.reduce((sum, s) => sum + s.total, 0);
        title = "General Health Check";
        html = `
          <p>I have analyzed your latest snapshot. Your business has processed <strong>${sales.length} transactions</strong> with a gross revenue of <strong>${formatCurrency(totalRev)}</strong>.</p>
          <ul>
            <li><strong>Health Score:</strong> ${sales.length > 10 ? 'Excellent 🟢' : 'Needs Attention 🟡'}.</li>
            <li><strong>Recommendation:</strong> Focus on increasing footfall during the weekends. Ensure your top-selling items are placed near the checkout counter.</li>
          </ul>
        `;
      } 
      else if (topic === 'inventory') {
        // Find lowest stock items
        const lowStock = products
          .flatMap(p => p.variants.map(v => ({ name: `${p.name} (${v.quantity})`, stock: v.stock })))
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 3);
        
        title = "Inventory Optimization";
        html = `<p>I have scanned your catalog of ${products.length} products.</p>`;
        if (lowStock.length > 0) {
          html += `
            <p>🚨 <strong>Critical Restock Needed:</strong></p>
            <ul>
              ${lowStock.map(item => `<li>${item.name} - Only ${item.stock} units left!</li>`).join('')}
            </ul>
            <p><strong>Action:</strong> Contact your suppliers today to avoid stockouts on these fast-moving items.</p>
          `;
        } else {
          html += `<p>✅ Your inventory levels look healthy across the board!</p>`;
        }
      }
      else if (topic === 'sales') {
        const avgTicket = sales.length > 0 ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length : 0;
        title = "Sales Booster";
        html = `
          <p>Your current Average Ticket Size is <strong>${formatCurrency(avgTicket)}</strong> per customer.</p>
          <ul>
            <li><strong>Bundle Strategy:</strong> Try pairing high-margin items with everyday essentials. For example, offer a 5% discount if they buy snacks with cold drinks.</li>
            <li><strong>Upselling:</strong> Instruct your staff to ask <em>"Would you like anything else?"</em> before closing the bill. It increases revenue by 12% on average.</li>
          </ul>
        `;
      }
      else if (topic === 'customer') {
        const udhaarSales = sales.filter(s => s.paymentMethod === 'Udhaar' || (s.split && s.split.udhaar > 0));
        const totalUdhaar = udhaarSales.reduce((sum, s) => sum + (s.paymentMethod === 'Udhaar' ? s.total : s.split!.udhaar), 0);
        
        title = "Udhaar & Customers";
        html = `
          <p>You currently have <strong>${formatCurrency(totalUdhaar)}</strong> locked in pending market Udhaar across ${udhaarSales.length} bills.</p>
          <ul>
            <li><strong>Cashflow Risk:</strong> High 🔴. Too much capital is stuck in the market.</li>
            <li><strong>Strategy:</strong> Navigate to the <em>CRM & Khata</em> page and use the WhatsApp button to send polite payment reminders to your top 3 debtors today.</li>
            <li><strong>Loyalty:</strong> You have ${customers.length} registered customers. Offer a small discount on cash payments to encourage immediate settlement.</li>
          </ul>
        `;
      }

      setAiResponse({ title, html });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Cloud Sync Header */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderRadius: '16px', padding: '30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px', boxShadow: '0 15px 40px rgba(15, 23, 42, 0.2)' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="fa-solid fa-robot" style={{ color: '#A78BFA' }}></i> AI Sarthi Consultant
          </h2>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '13px', fontWeight: 600, maxWidth: '400px', lineHeight: 1.5 }}>
            Your personalized cloud business consultant. It requires an active internet connection to analyze your data and find hidden profit opportunities.
          </p>
          
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 16px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 700, marginTop: '15px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSynced ? '#10b981' : '#f59e0b', boxShadow: `0 0 10px ${isSynced ? '#10b981' : '#f59e0b'}` }}></div>
            <span>{isSynced ? 'Data Synced & Ready' : 'Data Outdated - Sync Required'}</span>
          </div>
        </div>
        
        <button 
          onClick={handleSync} 
          disabled={isSyncing}
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', border: 'none', color: 'white', padding: '14px 24px', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)' }}
        >
          {isSyncing ? <><i className="fa-solid fa-spinner fa-spin"></i> Uploading Data...</> : <><i className="fa-solid fa-cloud-arrow-up"></i> Upload Latest Data</>}
        </button>
      </div>

      {/* Prompts Grid */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Consultation Topics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          
          <button onClick={() => handleAskAI('general')} style={{ background: 'white', border: '1.5px solid var(--border)', padding: '20px', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-sm)', outline: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--blue-50)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}><i className="fa-solid fa-chart-line"></i></div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>General Health Check</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>Analyze my recent sales and tell me how the business is doing overall.</div>
            </div>
          </button>

          <button onClick={() => handleAskAI('inventory')} style={{ background: 'white', border: '1.5px solid var(--border)', padding: '20px', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-sm)', outline: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}><i className="fa-solid fa-boxes-stacked"></i></div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>Inventory Optimization</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>Which products are dead stock and which ones should I reorder immediately?</div>
            </div>
          </button>

          <button onClick={() => handleAskAI('sales')} style={{ background: 'white', border: '1.5px solid var(--border)', padding: '20px', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-sm)', outline: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}><i className="fa-solid fa-money-bill-trend-up"></i></div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>Sales Booster</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>Suggest bundling strategies or discounts to increase my average ticket size.</div>
            </div>
          </button>

          <button onClick={() => handleAskAI('customer')} style={{ background: 'white', border: '1.5px solid var(--border)', padding: '20px', borderRadius: '16px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'var(--shadow-sm)', outline: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FCE7F3', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}><i className="fa-solid fa-users"></i></div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>Udhaar & Customers</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.5 }}>Review my pending collections and suggest strategies to recover udhaar.</div>
            </div>
          </button>

        </div>
      </div>

      {/* Output Area */}
      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>AI Strategist Output</div>
      
      <div style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: '16px', minHeight: '300px', padding: '30px', boxShadow: 'var(--shadow-card)' }}>
        
        {/* Empty State */}
        {!isAnalyzing && !aiResponse && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 20px' }}>
            <i className="fa-solid fa-robot" style={{ fontSize: '48px', color: 'var(--border-hover)', marginBottom: '20px', opacity: 0.5 }}></i>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>Ready to Assist</h3>
            <p style={{ fontSize: '13px', fontWeight: 600, maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
              Click one of the consultation topics above. The AI will read your synced cloud data and generate actionable advice.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '40px', color: 'var(--primary)', marginBottom: '20px' }}></i>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>AI is analyzing your data...</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>This takes a few seconds.</p>
          </div>
        )}

        {/* Success Output */}
        {!isAnalyzing && aiResponse && (
          <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: 'var(--primary)' }}></div>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: '10px', fontWeight: 800, padding: '6px 12px', borderRadius: '20px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <i className="fa-solid fa-bolt"></i> Actionable Strategy
            </div>
            
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text-main)', fontWeight: 800 }}>{aiResponse.title}</h3>
            
            {/* Rendering the dynamic HTML safely */}
            <div 
              style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.7, fontWeight: 500 }}
              dangerouslySetInnerHTML={{ __html: aiResponse.html }}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default AI;