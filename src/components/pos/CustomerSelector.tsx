import React from 'react';

interface CustomerSelectorProps {
  phone: string;
  name: string;
  onPhoneChange: (val: string) => void;
  onNameChange: (val: string) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({ 
  phone, name, onPhoneChange, onNameChange 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '0.5rem', 
      padding: '1rem', 
      backgroundColor: 'white', 
      borderBottom: '1px solid var(--border)' 
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Mobile Number
        </label>
        <input 
          type="tel" 
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="Enter 10 digits..."
          maxLength={10}
          style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Customer Name
        </label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Name (Optional)"
          style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none' }}
        />
      </div>
    </div>
  );
};