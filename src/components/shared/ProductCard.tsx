import React from 'react';
import type { Product, ProductVariant } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ProductCardProps {
  product: Product;
  actionLabel?: string; // Optional, kept for compatibility
  onActionClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onActionClick }) => {
  const vCount = product.variants.length;
  const maxToShow = 2;
  const variantsToShow = product.variants.slice(0, maxToShow);
  const vFirst = product.variants[0];

  if (!vFirst) return null;

  // Exact JS Loose Logic: Calculate Total Display Stock
  let totalBase = 0;
  const unit = vFirst.baseUnit || 'pcs';
  product.variants.forEach(v => {
    const bq = Number(v.baseQty) || 1;
    totalBase += (Number(v.stock) || 0) * (product.isLoose ? bq : 1);
  });
  
  // Format stock display (e.g., 2.5 kg vs 5 in stock)
  const displayStock = product.isLoose ? `${totalBase.toFixed(totalBase % 1 === 0 ? 0 : 2)} ${unit}` : `${totalBase} in stock`;

  // Exact JS Loose Logic: Calculate Unit Price
  const getUnitPrice = (v: ProductVariant) => product.isLoose ? v.price / (Number(v.baseQty) || 1) : v.price;

  return (
    <div className="prod-card" onClick={() => onActionClick(product)}>
      <button className="pc-info-btn" onClick={(e) => { e.stopPropagation(); /* Hook up info modal here if needed later */ }}>
        <i className="fa-solid fa-circle-info"></i>
      </button>
      
      {vCount > 1 && <div className="pc-badge">{vCount} Types</div>}
      {product.isLoose && <div className="pc-badge-loose" style={{ right: vCount > 1 ? '55px' : '0' }}>Loose / Wt</div>}
      
      <div className="pc-cat">{product.category || 'Gen'}</div>
      <div className="pc-name">{product.name}</div>
      
      <div className="pc-variant-prices">
        {variantsToShow.map(v => (
          <span key={v.id} className="pc-variant-item">
            {v.quantity}: {formatCurrency(getUnitPrice(v))}/{v.baseUnit || 'pcs'}
          </span>
        ))}
        {vCount > maxToShow && (
          <span className="pc-variant-item" style={{ background: 'transparent', color: 'var(--text-muted)', padding: 0, fontSize: '10px', fontWeight: 700 }}>
            +{vCount - maxToShow} more...
          </span>
        )}
      </div>
      
      <div className="pc-bottom">
        <span className="pc-stock">{displayStock}</span>
      </div>
    </div>
  );
};