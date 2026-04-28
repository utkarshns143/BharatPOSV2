import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../lib/firebase'; // Ensure this matches your path! (or '../lib/firebase')
import { doc, setDoc, writeBatch, getDoc } from 'firebase/firestore';
import type { Product, Sale, Customer, MerchantProfile, Expense } from '../types';

interface DataState {
  profile: MerchantProfile | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[]; // <-- Fixed from any[]
  
  // Base Setters
  setProfile: (profile: MerchantProfile | null) => void;
  setProducts: (products: Product[]) => void;
  setSales: (sales: Sale[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setExpenses: (expenses: Expense[]) => void; // <-- Fixed from any[]
  
  // Single Actions
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>; // <-- Fixed from any
  updateCustomer: (customer: Customer) => Promise<void>;

  // ... (leave the rest of your bulkUpdate and Firebase functions exactly the same)
  // --- NEW: MASS OPERATIONS & MULTI-BRANCH ENGINE ---
  bulkUpdateProducts: (updatedProducts: Product[]) => Promise<void>;
  bulkDeleteProducts: (productIds: string[]) => Promise<void>;
  transferStock: (productId: string, variantId: string, qty: number, targetBranchId: string) => Promise<void>;
  
  factoryReset: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      profile: null,
      products: [],
      sales: [],
      customers: [],
      expenses: [],
      
      setProfile: (profile) => set({ profile }),
      setProducts: (products) => set({ products }),
      setSales: (sales) => set({ sales }),
      setCustomers: (customers) => set({ customers }),
      setExpenses: (expenses) => set({ expenses }),

      // ══════════════════════════════════════════════════════════════
      // FIREBASE CLOUD ACTIONS
      // ══════════════════════════════════════════════════════════════

      addProduct: async (product) => {
        const { profile, products } = get();
        if (!profile) return;
        set({ products: [...products, product] });
        const docRef = doc(db, 'merchants', profile.merchantId, 'products', product.id);
        await setDoc(docRef, product, { merge: true });
      },

      updateProduct: async (product) => {
        const { profile, products } = get();
        if (!profile) return;
        set({ products: products.map(p => p.id === product.id ? product : p) });
        const docRef = doc(db, 'merchants', profile.merchantId, 'products', product.id);
        await setDoc(docRef, product, { merge: true });
      },

      // --- ADVANCED BULK UPDATER (Handles the 490 chunk limit) ---
      bulkUpdateProducts: async (updatedProducts) => {
        const { profile, products } = get();
        if (!profile) return;

        // 1. Instant Optimistic UI Update
        const updatedMap = new Map(updatedProducts.map(p => [p.id, p]));
        set({ products: products.map(p => updatedMap.has(p.id) ? updatedMap.get(p.id)! : p) });

        // 2. Chunked Firebase Batches
        let batch = writeBatch(db);
        let count = 0;
        for (const prod of updatedProducts) {
          const docRef = doc(db, 'merchants', profile.merchantId, 'products', prod.id);
          batch.set(docRef, prod, { merge: true });
          count++;
          if (count >= 490) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      },

      // --- ADVANCED BULK DELETER ---
      bulkDeleteProducts: async (productIds) => {
        const { profile, products } = get();
        if (!profile) return;

        const idsSet = new Set(productIds);
        set({ products: products.filter(p => !idsSet.has(p.id)) });

        let batch = writeBatch(db);
        let count = 0;
        for (const id of productIds) {
          const docRef = doc(db, 'merchants', profile.merchantId, 'products', id);
          batch.delete(docRef);
          count++;
          if (count >= 490) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      },

      // --- MULTI-BRANCH STOCK TRANSFER ENGINE ---
      transferStock: async (productId, variantId, qty, targetBranchId) => {
        const { profile, products } = get();
        if (!profile) return;

        // 1. Deduct locally instantly
        const pIndex = products.findIndex(p => p.id === productId);
        if (pIndex === -1) throw new Error("Product not found");

        const clonedProducts = [...products];
        const prod = { ...clonedProducts[pIndex] };
        const vIndex = prod.variants.findIndex(v => v.id === variantId);
        if (vIndex === -1) throw new Error("Variant not found");
        
        const variant = { ...prod.variants[vIndex] };
        if (variant.stock < qty) throw new Error("Not enough stock");
        
        variant.stock -= qty;
        prod.variants[vIndex] = variant;
        clonedProducts[pIndex] = prod;

        set({ products: clonedProducts });

        // 2. Update Source Firebase branch
        const localRef = doc(db, 'merchants', profile.merchantId, 'products', productId);
        await setDoc(localRef, prod, { merge: true });

        // 3. Increment in Target Firebase branch
        const targetRef = doc(db, 'merchants', targetBranchId, 'products', productId);
        const targetSnap = await getDoc(targetRef);

        if (targetSnap.exists()) {
          const targetProd = targetSnap.data() as Product;
          const targetVarIndex = targetProd.variants.findIndex(v => v.id === variantId);
          
          if (targetVarIndex !== -1) {
            targetProd.variants[targetVarIndex].stock += qty;
          } else {
            const newVar = { ...variant, stock: qty };
            targetProd.variants.push(newVar);
          }
          await setDoc(targetRef, targetProd, { merge: true });
        } else {
          // Send entirely new product structure to target branch with zeroed-out other variants
          const newProd = { ...prod, variants: prod.variants.map(v => v.id === variantId ? { ...v, stock: qty } : { ...v, stock: 0 }) };
          await setDoc(targetRef, newProd);
        }
      },

      addSale: async (sale) => {
        const { profile, sales } = get();
        if (!profile) return;
        set({ sales: [...sales, sale] });
        const docRef = doc(db, 'merchants', profile.merchantId, 'sales', sale.id);
        await setDoc(docRef, sale, { merge: true });
      },

      updateSale: async (sale) => {
        const { profile, sales } = get();
        if (!profile) return;
        set({ sales: sales.map(s => s.id === sale.id ? sale : s) });
        const docRef = doc(db, 'merchants', profile.merchantId, 'sales', sale.id);
        await setDoc(docRef, sale, { merge: true });
      },

      addExpense: async (expense) => {
        const { profile, expenses } = get();
        if (!profile) return;
        set({ expenses: [...expenses, expense] });
        const docRef = doc(db, 'merchants', profile.merchantId, 'expenses', expense.id);
        await setDoc(docRef, expense, { merge: true });
      },

      updateCustomer: async (customer) => {
        const { profile, customers } = get();
        if (!profile) return;
        const exists = customers.find(c => c.id === customer.id);
        if (exists) {
          set({ customers: customers.map(c => c.id === customer.id ? customer : c) });
        } else {
          set({ customers: [...customers, customer] });
        }
        const docRef = doc(db, 'merchants', profile.merchantId, 'customers', customer.id);
        await setDoc(docRef, customer, { merge: true });
      },

      factoryReset: () => set({ profile: null, products: [], sales: [], customers: [], expenses: [] }),
    }),
    {
      name: 'bharatpos-session',
      partialize: (state) => ({ profile: state.profile }), // Only persist session
    }
  )
);