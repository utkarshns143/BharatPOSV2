import { create } from 'zustand';
import type { Product, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  discount: number; // <-- NEW: Track Discount
  
  addItem: (product: Product, variantId?: string, qty?: number) => void;
  removeItem: (prodId: string, variantId: string) => void;
  setDiscount: (amount: number) => void; // <-- NEW: Update Discount
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,

  // --- UPGRADED ADD ITEM ---
  addItem: (product, variantId, qty = 1) => {
    const items = get().items;
    const vId = variantId || product.variants[0].id;
    const variant = product.variants.find(v => v.id === vId);

    if (!variant) return;

    const existingItem = items.find(i => i.prodId === product.id && i.variantId === vId);
    const currentQtyInCart = existingItem ? existingItem.qty : 0;

    // 🛑 LOOPHOLE CLOSED: PREVENT OVER-ADDING STOCK
    if (currentQtyInCart + qty > variant.stock) {
      alert(`Cannot add more. You only have ${variant.stock} of ${product.name} left in stock!`);
      return; 
    }

    if (existingItem) {
      set({
        items: items.map(i =>
          i.prodId === product.id && i.variantId === vId
            ? { ...i, qty: i.qty + qty, total: (i.qty + qty) * i.price }
            : i
        )
      });
   } else {
      set({
        items: [...items, {
          prodId: product.id,
          name: product.name,
          variantId: vId,
          variantName: (variant as any).name || 'Standard', // <-- Safely bypasses the name error
          price: variant.price,
          qty: qty,
          total: variant.price * qty,
          isLoose: product.isLoose // <-- Added to satisfy TypeScript
        }]
      });
    }
  },

  removeItem: (prodId, variantId) => set((state) => ({
    items: state.items.filter(i => !(i.prodId === prodId && i.variantId === variantId))
  })),

  setDiscount: (amount) => set({ discount: amount }),

  clearCart: () => set({ items: [], discount: 0 }),
  setItems: (items) => set({ items })
}));