import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  style, 
  ...props 
}) => {
  const baseStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : 'auto',
    ...style
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: 'var(--primary)', color: 'white' },
    secondary: { backgroundColor: '#e0e7ff', color: 'var(--primary)' },
    danger: { backgroundColor: 'var(--danger)', color: 'white' },
    outline: { backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }
  };

  return (
    <button style={{ ...baseStyle, ...variants[variant] }} {...props}>
      {children}
    </button>
  );
};