import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/useDataStore';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const setProfile = useDataStore(state => state.setProfile);

  const [mode, setMode] = useState<'registered' | 'new'>('registered');
  const [isLoading, setIsLoading] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);
  
  // Form State
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('');
  const [generatedId, setGeneratedId] = useState('');

  // --------------------------------------------------------
  // 1. HANDLE LOGIN (Fetch from Firestore)
  // --------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Look up the merchant in Firestore using their phone number
      const merchantRef = doc(db, 'merchants', phone);
      const merchantSnap = await getDoc(merchantRef);

      if (merchantSnap.exists()) {
        const data = merchantSnap.data() as any;
        
        // Save cloud data to local Zustand store
        setProfile(data);
        
        // Update UI state for the success modal
        setGeneratedId(data.merchantId);
        setShopName(data.shopName);
        setShowIdModal(true);
      } else {
        alert("No account found with this number. Please register as a New Merchant.");
      }
    } catch (error) {
      console.error("Error fetching merchant:", error);
      alert("Failed to connect to the database. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------
  // 2. HANDLE REGISTER (Save to Firestore)
  // --------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const finishAuth = async () => {
      try {
        // First, check if this phone number is already registered
        const merchantRef = doc(db, 'merchants', phone);
        const merchantSnap = await getDoc(merchantRef);

        if (merchantSnap.exists()) {
          alert("This phone number is already registered! Please switch to Login.");
          setIsLoading(false);
          return;
        }

        // Generate ID and create profile object
        const newId = `BHRT-${Math.floor(1000 + Math.random() * 9000)}`;
        const newProfile = {
           merchantId: newId,
           shopName: shopName,
           phone: phone,
           category: category || "GROCERY"
        };

        // Save new profile securely to Firestore
        await setDoc(merchantRef, newProfile);
        
        // Save to local Zustand store
        // Change "phone" to "mobile" and add "isBranch"
setProfile({
  merchantId: "your-id-variable", // keep whatever variable was here
  shopName: "your-shop-variable", // keep whatever variable was here
  mobile: phone,                  // Changed from phone: phone
  category: category,             // keep whatever variable was here
  isBranch: false                 // Added this!
});
        
        // Update UI
        setGeneratedId(newId);
        setShowIdModal(true);
      } catch (error) {
        console.error("Registration error:", error);
        alert("Failed to register. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    // Trigger Location Permission Request before registering
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(`Secured Location: Lat ${position.coords.latitude}, Lng ${position.coords.longitude}`);
          finishAuth();
        },
        () => {
          // If they block location, we can still let them register for now
          console.warn("Location blocked by user.");
          finishAuth();
        }
      );
    } else {
      finishAuth();
    }
  };

  const enterDashboard = () => {
    setShowIdModal(false);
    navigate('/pos'); 
  };

  return (
    <div className="login-page-wrapper">
      <div className="blob blob-tl"></div>
      <div className="blob blob-tr"></div>
      <div className="blob blob-br"></div>

      <div className="split-card">
        
        <div className="split-left">
          <div className="login-container">
            <div className="logo-box">
              <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'var(--primary)' }}>B</div>
            </div>
            
            <div className="form-box">
              <p className="wordmark">BharatPOS</p>
              <h2>Merchant<br/>Portal</h2>
              <p className="subtitle">Welcome! Log in or register your retail business.</p>

              <div className="mode-select">
                <button type="button" className={mode === 'registered' ? 'active' : ''} onClick={() => setMode('registered')}>Registered</button>
                <button type="button" className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>New Merchant</button>
              </div>

              {/* Login Form */}
              {mode === 'registered' && (
                <form onSubmit={handleLogin}>
                  <div className="input-group">
                    <label className="floating-label">Mobile Number</label>
                    <div className="phone-wrap">
                      <span className="phone-prefix">+91</span>
                      <input 
                        type="tel" 
                        placeholder="10-digit number" 
                        maxLength={10} 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="btn-group">
                    <button type="submit" className="primary-auth" disabled={isLoading}>
                      {isLoading ? <div className="spinner"></div> : <span>Login &nbsp;➔</span>}
                    </button>
                  </div>
                </form>
              )}

              {/* Registration Form */}
              {mode === 'new' && (
                <form onSubmit={handleRegister}>
                  <div className="input-group">
                    <label className="floating-label">Owner Name</label>
                    <input type="text" placeholder="e.g. Rajesh Kumar" required />
                  </div>
                  <div className="input-group">
                    <label className="floating-label">Mobile Number</label>
                    <div className="phone-wrap">
                      <span className="phone-prefix">+91</span>
                      <input 
                        type="tel" 
                        placeholder="10-digit number" 
                        maxLength={10} 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="floating-label">Shop Name</label>
                    <input type="text" placeholder="e.g. Raju General Store" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="floating-label">Shop Category</label>
                    <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="" disabled>Select category…</option>
                      <option value="GROCERY">Kirana / Grocery Store</option>
                      <option value="MEDICINE">Medical / Pharmacy</option>
                      <option value="ELECTRONIC">Electronics / Mobile Shop</option>
                      <option value="OTHER">Other Business</option>
                    </select>
                  </div>
                  <div className="btn-group">
                    <button type="submit" className="primary-auth" disabled={isLoading}>
                      {isLoading ? <div className="spinner"></div> : <span>Register Free Account &nbsp;⚡</span>}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>

        {/* Right Illustration Area */}
        <div className="split-right">
          <div className="ill-wrap">
            <div className="ill-badge">BHARATPOS</div>
            <div className="ill-square"></div>
            <div className="ill-circle ill-circle-a"></div>
            <div className="ill-circle ill-circle-b"></div>
            <div className="ill-circle ill-circle-c"></div>

            <div className="ill-cloud">
              <svg viewBox="0 0 500 340" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 170 120 Q 220 55 330 80 Q 430 58 462 160 Q 482 200 432 262 Q 382 305 282 294 Q 182 294 130 252 Q 80 210 170 120 Z" fill="#a8d5ff" fillOpacity="0.50"/>
              </svg>
            </div>

            <div className="ill-mockup">
              <svg viewBox="0 0 460 290" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="55" y="18" width="350" height="240" rx="14" fill="white" fillOpacity=".75" stroke="#5a9adb" strokeWidth="2.5"/>
                <rect x="55" y="18" width="350" height="28" rx="14" fill="#5a9adb"/>
                <rect x="55" y="32" width="350" height="14" fill="#5a9adb"/>
                <circle cx="72" cy="32" r="5" fill="white" fillOpacity=".7"/>
                <circle cx="88" cy="32" r="5" fill="white" fillOpacity=".7"/>
                <rect x="55" y="46" width="52" height="212" fill="#D6E6FF" fillOpacity=".75"/>
                <circle cx="81" cy="68"  r="9" fill="#7AA8F4"/>
                <circle cx="81" cy="92"  r="9" fill="#A5C0F0"/>
                <circle cx="81" cy="116" r="9" fill="#C9DAFD"/>
                <rect x="122" y="56"  width="82" height="7" rx="3.5" fill="#BDD2F7"/>
                <rect x="122" y="70"  width="60" height="7" rx="3.5" fill="#C9DAFD"/>
                <circle cx="304" cy="108" r="46" fill="#D6E4FF" fillOpacity=".9"/>
                <path d="M304 108 L304 62 A46 46 0 0 1 340 130 Z" fill="#5a9adb"/>
                <path d="M304 108 L340 130 A46 46 0 0 1 268 130 Z" fill="#87b5ff"/>
                <rect x="74"  y="188" width="20" height="46" rx="4" fill="#7AA8F4" fillOpacity=".85"/>
                <rect x="130" y="176" width="20" height="58" rx="4" fill="#5a9adb" fillOpacity=".85"/>
                <rect x="360" y="52" width="34" height="6" rx="3" fill="#BDD2F7"/>
                <rect x="360" y="66" width="34" height="6" rx="3" fill="#C9DAFD"/>
              </svg>
            </div>

            <div className="ill-person ill-person-l">
              <svg viewBox="0 0 90 162" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="45" cy="91" rx="22" ry="38" fill="#5a7c99"/>
                <circle cx="45" cy="42" r="18" fill="#d4a574"/>
                <path d="M28 43Q30 22 45 20Q60 22 62 43Q55 31 45 33Q35 31 28 43Z" fill="#2D2D2D"/>
                <rect x="30" y="122" width="12" height="30" rx="6" fill="#4a6fb5"/>
                <rect x="48" y="122" width="12" height="30" rx="6" fill="#4a6fb5"/>
              </svg>
            </div>

            <div className="ill-person ill-person-r">
              <svg viewBox="0 0 90 162" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="45" cy="91" rx="22" ry="38" fill="#4a6fb5"/>
                <circle cx="45" cy="42" r="18" fill="#d4a574"/>
                <path d="M28 45Q29 24 45 22Q61 24 62 45Q55 35 45 37Q35 35 28 45Z" fill="#2D2D2D"/>
                <rect x="64" y="78" width="22" height="14" rx="5" fill="#d4a574"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showIdModal && (
        <div className="id-modal-overlay">
          <div className="id-card">
            <div className="logo-box" style={{ width: '52px', height: '52px', margin: '0 auto 14px auto' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>B</div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1.2px' }}>
              Welcome to BharatPOS
            </div>
            <h3>{shopName || 'Your Shop'}</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your Unique Merchant ID</div>
            <div className="id-value">{generatedId}</div>
            <button className="primary-auth" onClick={enterDashboard}>
              Login to web &nbsp;➔
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;