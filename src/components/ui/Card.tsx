import React from 'react';

// By extending React.HTMLAttributes<HTMLDivElement>, we tell TypeScript 
// that this component accepts onClick, onMouseEnter, className, etc!
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  padding = '1.5rem', 
  style, 
  ...props // <-- Capture all other props (like onClick)
}) => {
  return (
    <div 
      style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: padding,
        ...style
      }}
      {...props} // <-- Apply them to the div
    >
      {children}
    </div>
  );
};