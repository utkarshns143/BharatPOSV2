import React from 'react';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ProductCardProps {
  product: Product;
  actionLabel: string;
  onActionClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, actionLabel, onActionClick }) => {
  // We grab the first variant to display the base price
  const baseVariant = product.variants[0];

  return (
    <Card padding="1rem" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{product.name}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
        {product.category}
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem' }}>
        <strong style={{ fontSize: '1.2rem', color: 'var(--success)' }}>
          {baseVariant ? formatCurrency(baseVariant.price) : 'N/A'}
        </strong>
        
        <Button 
          variant="primary" 
          onClick={() => onActionClick(product)}
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
};