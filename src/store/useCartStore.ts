// File: src/store/useCartStore.ts

import { create } from 'zustand';
import type { Product, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  discount: number;
  
  addItem: (product: Product, variantId?: string, qty?: number) => void;
  addCustomItem: (name: string, price: number) => void;
  updateQty: (prodId: string, variantId: string, delta: number) => void;
  removeItem: (prodId: string, variantId: string) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,

  addItem: (product, variantId, qty = 1) => {
    const items = get().items;
    const vId = variantId || product.variants[0].id;
    const variant = product.variants.find(v => v.id === vId);

    if (!variant) return;

    // 🛑 EXACT JS LOOSE LOGIC FOR CART
    const bq = Number(variant.baseQty) || 1;
    const availableUnits = product.isLoose ? Number(variant.stock) * bq : Number(variant.stock);
    const unitPrice = product.isLoose ? variant.price / bq : variant.price;
    const unitLabel = variant.baseUnit || 'pcs';

    const existingItem = items.find(i => i.prodId === product.id && i.variantId === vId);
    const currentQtyInCart = existingItem ? existingItem.qty : 0;

    if (currentQtyInCart + qty > availableUnits) {
      alert(`Cannot add more. Only ${availableUnits} ${unitLabel} available in stock!`);
      return; 
    }

    if (existingItem) {
      set({
        items: items.map(i =>
          i.prodId === product.id && i.variantId === vId
            ? { ...i, qty: i.qty + qty, total: (i.qty + qty) * unitPrice }
            : i
        )
      });
    } else {
      set({
        items: [...items, {
          prodId: product.id,
          variantId: vId,
          name: product.name,
          variantName: variant.quantity || 'Standard',
          price: unitPrice,
          qty: qty,
          total: unitPrice * qty,
          isLoose: product.isLoose,
          unitLabel: unitLabel
        }]
      });
    }
  },

  addCustomItem: (name, price) => {
    const items = get().items;
    set({
      items: [...items, {
        prodId: `custom_${Date.now()}`,
        variantId: 'custom',
        name: name,
        variantName: 'Service',
        price: price,
        qty: 1,
        total: price,
        isLoose: false,
        unitLabel: 'request'
      }]
    });
  },

  updateQty: (prodId, variantId, delta) => {
    const items = get().items;
    const existingItem = items.find(i => i.prodId === prodId && i.variantId === variantId);
    if (!existingItem) return;

    const newQty = existingItem.qty + delta;
    if (newQty < 1) return; // Use removeItem if they drop below 1

    // We rely on the UI to prevent exceeding stock for simplicity here, 
    // but the math updates perfectly.
    set({
      items: items.map(i =>
        i.prodId === prodId && i.variantId === variantId
          ? { ...i, qty: newQty, total: newQty * i.price }
          : i
      )
    });
  },

  removeItem: (prodId, variantId) => set((state) => ({
    items: state.items.filter(i => !(i.prodId === prodId && i.variantId === variantId))
  })),

  setDiscount: (amount) => set({ discount: amount }),
  clearCart: () => set({ items: [], discount: 0 }),
  setItems: (items) => set({ items })
}));