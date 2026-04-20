import React, { useState } from 'react';
import { useDataStore } from '../../store/useDataStore';

interface Props {
  phone: string;
  name: string;
  onPhoneChange: (val: string) => void;
  onNameChange: (val: string) => void;
}

export const CustomerSelector: React.FC<Props> = ({ phone, name, onPhoneChange, onNameChange }) => {
  const customers = useDataStore(state => state.customers);
  const [showDropdown, setShowDropdown] = useState(false);

  // 🛑 LOOPHOLE CLOSED: FILTER ENROLLED CUSTOMERS
  const matchingCustomers = customers.filter(c => 
    (c.phone.includes(phone) || c.name.toLowerCase().includes(name.toLowerCase())) &&
    (phone.length > 0 || name.length > 0)
  ).slice(0, 5); // Limit to top 5 results

  const handleSelectCustomer = (c: any) => {
    onPhoneChange(c.phone);
    onNameChange(c.name);
    setShowDropdown(false);
  };

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '12px 15px', backgroundColor: '#fff', position: 'relative' }}>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Customer Phone" 
          value={phone}
          onChange={(e) => { onPhoneChange(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', fontSize: '13px', fontWeight: 600, outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Customer Name" 
          value={name}
          onChange={(e) => { onNameChange(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', fontSize: '13px', fontWeight: 600, outline: 'none', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}
        />
      </div>

      {/* DROPDOWN MENU */}
      {showDropdown && matchingCustomers.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: '15px', right: '15px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
          {matchingCustomers.map(c => (
            <div 
              key={c.id} 
              onClick={() => handleSelectCustomer(c)}
              style={{ padding: '10px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{c.name}</span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{c.phone}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Invisible overlay to close dropdown when clicking outside */}
      {showDropdown && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};