import { create } from 'zustand';
import type { Product, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, variantId?: string, qty?: number) => void;
  removeItem: (prodId: string, variantId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (product, variantId, qty = 1) => set((state) => {
    // 1. If no variant is specified, default to the first one
    const targetVariantId = variantId || product.variants[0].id;
    const variant = product.variants.find(v => v.id === targetVariantId) || product.variants[0];

    // 2. Check if this exact product+variant combo is already in the cart
    const existingIndex = state.items.findIndex(
      item => item.prodId === product.id && item.variantId === targetVariantId
    );

    if (existingIndex >= 0) {
      // Update quantity of existing item
      const updatedItems = [...state.items];
      const item = updatedItems[existingIndex];
      const newQty = item.qty + qty;
      
      updatedItems[existingIndex] = {
        ...item,
        qty: newQty,
        total: newQty * item.price
      };
      
      return { items: updatedItems };
    } else {
      // Add brand new item to cart
      const newItem: CartItem = {
        prodId: product.id,
        variantId: targetVariantId,
        name: product.name,
        variantName: variant.quantity,
        price: variant.price,
        qty: qty,
        isLoose: product.isLoose,
        total: qty * variant.price
      };
      
      return { items: [...state.items, newItem] };
    }
  }),

  removeItem: (prodId, variantId) => set((state) => ({
    items: state.items.filter(item => !(item.prodId === prodId && item.variantId === variantId))
  })),

  clearCart: () => set({ items: [] })
}));