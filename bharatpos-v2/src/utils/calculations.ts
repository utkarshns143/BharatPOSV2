import type { CartItem, Sale } from '../types';

// 1. Calculate the total of the current cart in the POS
export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.total, 0);
};

// 2. Calculate pending Udhaar across the entire business
export const calculateTotalUdhaar = (sales: Sale[]): number => {
  return sales.reduce((total, sale) => {
    // If it's a full Udhaar bill
    if (!sale.isPaid && sale.paymentMethod === 'Udhaar') {
      return total + sale.total;
    }
    // If it's a split bill (Part Cash, Part Udhaar)
    if (!sale.isPaid && sale.split?.udhaar) {
      return total + sale.split.udhaar;
    }
    return total;
  }, 0);
};

// 3. Calculate total revenue (Cash + Online only, ignore Udhaar until paid)
export const calculateTotalRevenue = (sales: Sale[]): number => {
  return sales.reduce((total, sale) => {
    if (sale.paymentMethod === 'Cash' || sale.paymentMethod === 'Online') {
      return total + sale.total;
    }
    if (sale.split) {
      return total + (sale.split.cash || 0) + (sale.split.online || 0);
    }
    return total;
  }, 0);
};