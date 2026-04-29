// File: src/store/useCustomerStore.ts
import { create } from 'zustand';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Sale, } from '../types';

interface CustomerState {
  phone: string | null;
  activeShopId: string | null;
  myBills: Sale[];
  shopsMap: Record<string, { id: string, name: string, lat?: number, lng?: number }>;
  
  setPhone: (phone: string | null) => void;
  setActiveShopId: (id: string | null) => void;
  
  // Securely fetch ONLY this customer's bills
  fetchMyKhata: () => Promise<void>;
  
  // Logout
  logoutCustomer: () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  phone: localStorage.getItem('khata_user_phone') || null,
  activeShopId: null,
  myBills: [],
  shopsMap: {},

  setPhone: (phone) => {
    if (phone) localStorage.setItem('khata_user_phone', phone);
    else localStorage.removeItem('khata_user_phone');
    set({ phone });
  },

  setActiveShopId: (id) => set({ activeShopId: id }),

  fetchMyKhata: async () => {
    const { phone } = get();
    if (!phone) return;

    try {
      // SECURE FIREBASE QUERY: Only get bills where customerPhone matches
      const salesQuery = query(collectionGroup(db, 'sales'), where('customerPhone', '==', phone));
      const snapshot = await getDocs(salesQuery);
      
      const rawSales: Sale[] = [];
      const uniqueShopIds = new Set<string>();

      snapshot.forEach(docSnap => {
        const s = docSnap.data() as Sale;
        const shopId = s._branchId || docSnap.ref.parent.parent?.id;
        if (shopId) {
          uniqueShopIds.add(shopId);
          rawSales.push({ ...s, _branchId: shopId });
        }
      });

      // Resolve shop names for the UI
      const shopsMap: Record<string, any> = {};
      for (const shopId of uniqueShopIds) {
        const shopDoc = await getDoc(doc(db, "shops", shopId));
        if (shopDoc.exists()) {
          const profile = shopDoc.data().profile || shopDoc.data();
          shopsMap[shopId] = { id: shopId, name: profile.shopName || 'Retail Store', lat: profile.lat, lng: profile.lng };
        } else {
          shopsMap[shopId] = { id: shopId, name: 'Local Shop' };
        }
      }

      set({ myBills: rawSales, shopsMap, activeShopId: Array.from(uniqueShopIds)[0] || null });

    } catch (error) {
      console.error("Khata Sync Failed:", error);
    }
  },

  logoutCustomer: () => {
    localStorage.removeItem('khata_user_phone');
    set({ phone: null, activeShopId: null, myBills: [], shopsMap: {} });
  }
}));