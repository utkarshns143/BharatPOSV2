import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/useDataStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { MerchantProfile } from '../../types';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  
  // Connect to global store
  const { profile, setProfile, products, sales, customers, setProducts, setSales, setCustomers, factoryReset } = useDataStore();

  // Form State
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [qrCode, setQrCode] = useState<string | undefined>();

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Profile Data on Mount
  useEffect(() => {
    if (profile) {
      setShopName(profile.shopName || '');
      setCategory(profile.category || 'GROCERY');
      setGstin(profile.gstin || '');
      setAddress(profile.address || '');
      setLat(profile.lat);
      setLng(profile.lng);
      setQrCode(profile.qrCodeBase64);
    }
  }, [profile]);

  // 2. Save Profile
  const handleSaveProfile = () => {
    if (!profile) return;
    const updatedProfile: MerchantProfile = {
      ...profile, shopName, category, gstin, address, lat, lng, qrCodeBase64: qrCode
    };
    setProfile(updatedProfile);
    alert('Profile saved successfully!');
  };

  // 3. GPS Location Fetcher
  const handleGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported by your browser");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        alert("GPS Location acquired successfully!");
      },
      () => alert("Unable to retrieve your location. Please check browser permissions.")
    );
  };

  // 4. QR Code Image Uploader (Base64 conversion)
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setQrCode(reader.result as string);
    reader.readAsDataURL(file);
  };

  // 5. Data Export (JSON)
  const handleExport = () => {
    const data = { profile, products, sales, customers };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BharatPOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // 6. Data Import (JSON)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.profile) setProfile(data.profile);
        if (data.products) setProducts(data.products);
        if (data.sales) setSales(data.sales);
        if (data.customers) setCustomers(data.customers);
        alert("Data imported successfully!");
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  // 7. Security Actions
  const handleReset = () => {
    if (window.confirm("WARNING: This will wipe all offline data on this device. Continue?")) {
      factoryReset();
      alert("Device cache cleared.");
      navigate('/login');
    }
  };

  const handleDeleteAccount = () => {
    if (deleteInput === 'DELETE') {
      factoryReset();
      alert("Account deleted. We are sorry to see you go.");
      navigate('/login');
    } else {
      alert("You must type DELETE exactly.");
    }
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '1.8rem' }}>⚙️ Settings & Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <Card padding="1.5rem">
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <i className="fa-solid fa-store"></i> Business Profile
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Registered Mobile</label>
                  <input type="text" value={profile?.phone || 'Loading...'} readOnly style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#f1f5f9', color: 'var(--text-muted)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Merchant ID</label>
                  <input type="text" value={profile?.merchantId || 'Loading...'} readOnly style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#f1f5f9', color: 'var(--text-muted)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Shop Name</label>
                <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'white' }}>
                    <option value="GROCERY">Kirana / Grocery</option>
                    <option value="MEDICAL">Pharmacy / Medical</option>
                    <option value="ELECTRONIC">Electronics</option>
                    <option value="OTHER">Other Retail</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>GSTIN (Optional)</label>
                  <input type="text" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Complete Address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Shop No, Street, City..." style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>📍 Map Location (GPS)</label>
                <div style={{ position: 'relative', width: '100%', height: '150px', backgroundColor: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {lat && lng ? (
                    <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`} style={{ border: 'none' }}></iframe>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No GPS data saved.</div>
                  )}
                  <Button variant="outline" onClick={handleGPS} style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', color: 'var(--primary)', borderColor: 'var(--primary)', padding: '0.4rem 1rem' }}>
                    🎯 Acquire GPS
                  </Button>
                </div>
              </div>

              <Button variant="primary" onClick={handleSaveProfile} style={{ marginTop: '1rem', padding: '1rem' }}>
                ☁️ Save & Sync Profile
              </Button>
            </div>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <Card padding="1.5rem">
             <h3 style={{ margin: '0 0 1rem 0', color: '#9333ea', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <i className="fa-solid fa-qrcode"></i> UPI Payment QR
            </h3>
            <div 
              onClick={() => qrInputRef.current?.click()}
              style={{ border: '2px dashed var(--primary)', borderRadius: '12px', padding: '2rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              <input type="file" ref={qrInputRef} onChange={handleQrUpload} accept="image/*" style={{ display: 'none' }} />
              {qrCode ? (
                <img src={qrCode} alt="UPI QR" style={{ maxWidth: '150px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }} />
              ) : (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Tap to Upload Shop QR</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Customers will scan this at checkout</div>
                </>
              )}
            </div>
          </Card>

          <Card padding="1.5rem">
            <h3 style={{ margin: '0 0 1rem 0', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <i className="fa-solid fa-database"></i> Data Management
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Button variant="outline" onClick={handleExport}>📤 Export Backup</Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>📥 Import Data</Button>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" style={{ display: 'none' }} />
            </div>
            <Button onClick={handleReset} style={{ width: '100%', marginTop: '1rem', padding: '1rem', backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 'bold' }}>
              ⚠️ Factory Reset (Clear Local Cache)
            </Button>
          </Card>

          <Card padding="1.5rem" style={{ border: '1px solid #fecaca' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #fecaca', paddingBottom: '0.5rem' }}>
              <i className="fa-solid fa-shield-halved"></i> Account Security
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Button variant="outline" onClick={() => navigate('/login')}>Logout</Button>
              <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Delete Account</Button>
            </div>
          </Card>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ color: 'var(--danger)', margin: '0 0 1rem 0' }}>⚠️ Delete Account</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              This action cannot be undone. All your products, sales, and customer data will be permanently deleted.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>Type "DELETE" to confirm</label>
              <input type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder="DELETE" style={{ padding: '1rem', borderRadius: '8px', border: '2px solid var(--danger)', color: 'var(--danger)', outline: 'none', fontWeight: 'bold' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={deleteInput !== 'DELETE'} style={{ flex: 1 }}>Permanently Delete</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;