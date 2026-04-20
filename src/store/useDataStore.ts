import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // <-- Bring this back
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { Product, Sale, Customer, MerchantProfile, Expense } from '../types';

interface DataState {
  profile: MerchantProfile | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  
  setProfile: (profile: MerchantProfile | null) => void;
  setProducts: (products: Product[]) => void;
  setSales: (sales: Sale[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  
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

      addSale: async (sale) => {
        const { profile, sales } = get();
        if (!profile) return;
        set({ sales: [...sales, sale] });
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
      name: 'bharatpos-session', // Renamed to reflect it only holds the session
      
      // ══════════════════════════════════════════════════════════════
      // THE MAGIC FIX: Only save the 'profile' to localStorage
      // ══════════════════════════════════════════════════════════════
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);