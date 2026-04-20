import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useFirebaseData } from '../../hooks/useFirebaseData';
import { ShoppingCart, BookOpen, LayoutDashboard, Package, Menu, X, Receipt, SettingsIcon, BarChart3, Wallet, BrainCircuit, Bot } from 'lucide-react';
export const AppLayout: React.FC = () => {

 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.8rem 1rem', borderRadius: 'var(--radius)',
    textDecoration: 'none', fontWeight: 'bold',
    color: isActive ? 'white' : 'var(--text-muted)',
    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
    transition: 'all 0.2s ease'
  });

  const closeMenu = () => setIsMobileMenuOpen(false);
  useFirebaseData();
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-color)', flexDirection: 'column' }}>
      
      {/* MOBILE TOP BAR (Only visible on small screens) */}
      <div className="desktop-only" style={{ display: 'none' }} /> {/* Keeps CSS happy */}
      <div style={{ display: window.innerWidth > 900 ? 'none' : 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'white', borderBottom: '1px solid var(--border)', zIndex: 50 }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>BharatPOS</h1>
        <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Menu size={24} color="var(--text-main)" />
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ================= SIDEBAR ================= */}
        {/* Overlay for mobile to darken background */}
        {isMobileMenuOpen && (
          <div 
            onClick={closeMenu}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99 }} 
          />
        )}

        <nav style={{ 
          width: '250px', backgroundColor: 'white', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          position: window.innerWidth <= 900 ? 'fixed' : 'relative',
          top: 0, bottom: 0, left: 0, zIndex: 100,
          transform: window.innerWidth <= 900 ? (isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: 'transform 0.3s ease'
        }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>BharatPOS</h1>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>v2.0 Beta</span>
            </div>
            {/* Mobile Close Button */}
            {window.innerWidth <= 900 && (
              <button onClick={closeMenu} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', flex: 1 }}>
            <NavLink to="/pos" onClick={closeMenu} style={navLinkStyle}><ShoppingCart size={20} /> Point of Sale</NavLink>
            <NavLink to="/inventory" onClick={closeMenu} style={navLinkStyle}><Package size={20} /> Inventory</NavLink>
            <NavLink to="/khata" onClick={closeMenu} style={navLinkStyle}><BookOpen size={20} /> Customers</NavLink>
            <NavLink to="/dashboard" onClick={closeMenu} style={navLinkStyle}><LayoutDashboard size={20} /> Dashboard</NavLink>
            <NavLink to="/sales" onClick={closeMenu} style={navLinkStyle}><Receipt size={20} /> Sales Ledger</NavLink>
            <NavLink to="/settings" onClick={closeMenu} style={navLinkStyle}><SettingsIcon size={20} /> Settings</NavLink>
            <NavLink to="/reports" onClick={closeMenu} style={navLinkStyle}><BarChart3 size={20} /> Reports & Audit</NavLink>
            <NavLink to="/finance" onClick={closeMenu} style={navLinkStyle}><Wallet size={20} /> Finance HQ</NavLink>
            <NavLink to="/forecast" onClick={closeMenu} style={navLinkStyle}><BrainCircuit size={20} /> Sales Forecast</NavLink>
          <NavLink to="/ai" onClick={closeMenu} style={navLinkStyle}><Bot size={20} /> AI Sarthi</NavLink>
          </div>
        
        </nav>

        {/* ================= MAIN CONTENT AREA ================= */}
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <Outlet />
        </main>

      </div>
    </div>
  );
};