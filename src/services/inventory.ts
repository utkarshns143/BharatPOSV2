import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product } from '../types';

export const fetchProductsFromDB = async (): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      // Force TypeScript to treat the Firebase data as our strict Product schema
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};