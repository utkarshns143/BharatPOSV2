import { create } from 'zustand';
import type { Product, Sale, Customer } from '../types';

interface DataState {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  
  // Actions to update the state
  setProducts: (products: Product[]) => void;
  setSales: (sales: Sale[]) => void;
  setCustomers: (customers: Customer[]) => void;
}

export const useDataStore = create<DataState>((set) => ({
  products: [],
  sales: [],
  customers: [],
  
  setProducts: (products) => set({ products }),
  setSales: (sales) => set({ sales }),
  setCustomers: (customers) => set({ customers }),
}));