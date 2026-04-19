import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const dict = {
  en: {
    freemium: "⭐ Freemium Plan Available",
    heroTitle1: "The Smart Retail OS",
    heroTitle2: "Built for ",
    heroHighlight: "Growth.",
    heroDesc: "A premium point-of-sale, inventory, and customer management system designed to make running your business effortless and professional. No complex setups. Just results.",
    launchBtn: "Launch Dashboard",
    f1Title: "Lightning Billing",
    f1Desc: "Process transactions in seconds. Manage cash, UPI, and split payments flawlessly through an elegant, clutter-free interface.",
    f2Title: "Intelligent Inventory",
    f2Desc: "Never run out of stock. Track variants, manage purchasing costs, and get automated alerts when it's time to reorder.",
    f3Title: "Digital Khata",
    f3Desc: "Replace paper ledgers with a secure digital system. Track pending customer dues and manage your shop's daily expenses.",
    footerText: "Engineered for Modern Retail Businesses."
  },
  hi: {
    freemium: "⭐ Freemium Plan Available",
    heroTitle1: "Smart Retail OS",
    heroTitle2: "Jo Banaye Business ",
    heroHighlight: "Aasaan.",
    heroDesc: "Ek premium point-of-sale, stock, aur grahak management system. Apni dukan ko bina kisi jhanjhat ke, ek professional ki tarah chalayein.",
    launchBtn: "Dashboard Kholein",
    f1Title: "Lightning Billing",
    f1Desc: "Seconds mein bill banayein. Cash, UPI, aur split payments ko ek behad aasaan aur clean interface ke zariye manage karein.",
    f2Title: "Intelligent Inventory",
    f2Desc: "Stock kabhi khatam nahi hoga. Variants track karein aur jab naya saaman mangwana ho toh automatic alerts payein.",
    f3Title: "Digital Khata",
    f3Desc: "Kagaz ke khate ko secure digital system se badlein. Grahakon ka udhaar aur dukan ke kharche asani se track karein.",
    footerText: "Modern Retail Businesses Ke Liye Banaya Gaya."
  }
};

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const t = dict[lang];

  // --- NEW: PWA Service Worker Registration ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('PWA ServiceWorker registered successfully:', registration.scope);
        })
        .catch((error) => {
          console.log('PWA ServiceWorker registration failed:', error);
        });
    }
  }, []);
  // --------------------------------------------

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.animate-section').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);


  return (
    
    <div className="landing-wrapper">
      {/* Immersive Ambient Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* Glassmorphism Navigation */}
      <nav className="glass-nav">
        <div className="nav-brand" onClick={() => window.scrollTo(0,0)}>
          <div className="nav-logo-3d">B</div>
          <span className="nav-text">BharatPOS</span>
        </div>
        <button className="lang-switch" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
          <i className="fa-solid fa-language"></i> {lang === 'en' ? 'English' : 'हिंदी'}
        </button>
      </nav>

      {/* Hero Section */}
      <header className="hero-glass">
        <div className="hero-content">
          <div className="freemium-tag">{t.freemium}</div>
          <h1 className="hero-title">
            <span>{t.heroTitle1}</span><br/>
            <span>{t.heroTitle2}</span>
            <span className="highlight">{t.heroHighlight}</span>
          </h1>
          <p className="hero-desc">{t.heroDesc}</p>
          
          <button className="btn-launch" onClick={() => navigate('/login')}>
            {t.launchBtn} <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>

        {/* Pure CSS 3D Isometric Art (No Images Used) */}
        <div className="hero-3d-scene">
          <div className="iso-wrapper">
            <div className="iso-base"></div>
            
            {/* 3D Element 1: Analytics Bar Chart */}
            <div className="iso-card iso-card-1">
              <div className="iso-bar" style={{ height: '30%' }}></div>
              <div className="iso-bar" style={{ height: '60%' }}></div>
              <div className="iso-bar" style={{ height: '100%' }}></div>
            </div>

            {/* 3D Element 2: Receipt/Invoice */}
            <div className="iso-card iso-card-2">
              <div className="iso-line short"></div>
              <div className="iso-line" style={{ marginTop: '15px' }}></div>
              <div className="iso-line"></div>
              <div className="iso-line" style={{ width: '80%' }}></div>
              <div className="iso-line short" style={{ marginTop: '15px', background: '#10b981' }}></div>
            </div>

            {/* 3D Element 3: Inventory Package */}
            <div className="iso-card iso-card-3">
              <i className="fa-solid fa-box-open"></i>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="features-glass">
        <div className="feature-grid">
          
          <div className="glass-card">
            <div className="gc-icon" style={{ color: 'var(--accent-cyan)' }}>
              <i className="fa-solid fa-cash-register"></i>
            </div>
            <h3 className="gc-title">{t.f1Title}</h3>
            <p className="gc-desc">{t.f1Desc}</p>
          </div>

          <div className="glass-card">
            <div className="gc-icon" style={{ color: 'var(--primary)' }}>
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <h3 className="gc-title">{t.f2Title}</h3>
            <p className="gc-desc">{t.f2Desc}</p>
          </div>

          <div className="glass-card">
            <div className="gc-icon" style={{ color: 'var(--accent-purple)' }}>
              <i className="fa-solid fa-book-open"></i>
            </div>
            <h3 className="gc-title">{t.f3Title}</h3>
            <p className="gc-desc">{t.f3Desc}</p>
          </div>

        </div>
      </section>

      <footer className="footer-glass">
        <p>{t.footerText}</p>
        <p style={{ opacity: 0.4, fontSize: '11px', letterSpacing: '2px', marginTop: '10px' }}>UTKARSH SHARMA</p>
      </footer>
    </div>
  );
};

export default Landing;