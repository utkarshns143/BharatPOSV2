import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Sale, Customer, MerchantProfile, Expense } from '../types'; // <-- Import Expense

interface DataState {
  profile: MerchantProfile | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[]; // <-- Add this
  
  setProfile: (profile: MerchantProfile | null) => void;
  setProducts: (products: Product[]) => void;
  setSales: (sales: Sale[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setExpenses: (expenses: Expense[]) => void; // <-- Add this
  factoryReset: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      profile: null,
      products: [],
      sales: [],
      customers: [],
      expenses: [], // <-- Initial state
      
      setProfile: (profile) => set({ profile }),
      setProducts: (products) => set({ products }),
      setSales: (sales) => set({ sales }),
      setCustomers: (customers) => set({ customers }),
      setExpenses: (expenses) => set({ expenses }), // <-- Action
      factoryReset: () => set({ profile: null, products: [], sales: [], customers: [], expenses: [] }),
    }),
    {
      name: 'bharatpos-local-storage',
    }
  )
);