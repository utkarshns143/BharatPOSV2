import React from 'react';

interface CardProps {
  children: React.ReactNode;
  padding?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, padding = '1.5rem', style }) => {
  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow)',
      padding: padding,
      ...style
    }}>
      {children}
    </div>
  );
};