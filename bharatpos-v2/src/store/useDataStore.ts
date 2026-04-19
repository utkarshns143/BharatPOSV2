import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Sale, Customer, MerchantProfile } from '../types';

interface DataState {
  profile: MerchantProfile | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  
  setProfile: (profile: MerchantProfile | null) => void;
  setProducts: (products: Product[]) => void;
  setSales: (sales: Sale[]) => void;
  setCustomers: (customers: Customer[]) => void;
  factoryReset: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      profile: null,
      products: [],
      sales: [],
      customers: [],
      
      setProfile: (profile) => set({ profile }),
      setProducts: (products) => set({ products }),
      setSales: (sales) => set({ sales }),
      setCustomers: (customers) => set({ customers }),
      factoryReset: () => set({ profile: null, products: [], sales: [], customers: [] }),
    }),
    {
      name: 'bharatpos-local-storage',
    }
  )
);