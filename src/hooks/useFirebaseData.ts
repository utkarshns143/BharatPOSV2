import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useDataStore } from '../store/useDataStore';
import type { Product, Sale, Expense, Customer } from '../types';

export const useFirebaseData = () => {
  const profile = useDataStore((state) => state.profile);
  const setProducts = useDataStore((state) => state.setProducts);
  const setSales = useDataStore((state) => state.setSales);
  const setExpenses = useDataStore((state) => state.setExpenses);
  const setCustomers = useDataStore((state) => state.setCustomers);
  
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    // If no merchant is logged in, do nothing
    if (!profile?.merchantId) {
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    const mId = profile.merchantId;

    console.log(`🔌 Connecting to Firebase for Merchant: ${mId}`);

    // 1. Sync Products
    const unsubProducts = onSnapshot(collection(db, 'merchants', mId, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Product);
      setProducts(data);
    });

    // 2. Sync Sales
    const unsubSales = onSnapshot(collection(db, 'merchants', mId, 'sales'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Sale);
      setSales(data);
    });

    // 3. Sync Expenses
    const unsubExpenses = onSnapshot(collection(db, 'merchants', mId, 'expenses'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Expense);
      setExpenses(data);
    });

    // 4. Sync Customers
    const unsubCustomers = onSnapshot(collection(db, 'merchants', mId, 'customers'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Customer);
      setCustomers(data);
    });

    setIsSyncing(false);

    // CLEANUP: If the user logs out or closes the component, stop listening to save memory/data
    return () => {
      unsubProducts();
      unsubSales();
      unsubExpenses();
      unsubCustomers();
      console.log('🛑 Disconnected Firebase Listeners');
    };
  }, [profile?.merchantId, setProducts, setSales, setExpenses, setCustomers]);

  return { isSyncing };
};