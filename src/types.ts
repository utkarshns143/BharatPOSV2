export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'merchant' | 'staff';
}

export interface ProductVariant {
  id: string;
  quantity: string;
  price: number;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  isLoose: boolean;
  reorderPoint: number;
  hsn?: string;
  gstRate?: number;
  priceType?: 'inclusive' | 'exclusive';
  batchId?: string;
}

export interface CartItem {
  prodId: string;
  variantId: string;
  name: string;
  variantName: string;
  price: number;
  qty: number;
  isLoose: boolean;
  total: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'Cash' | 'Online' | 'Partial' | 'Udhaar';
  isPaid: boolean;
  customerId?: string;
  split?: {
    cash: number;
    online: number;
    udhaar: number;
  };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  pendingUdhaar: number;
  history: string[]; 
}

export interface MerchantProfile {
  merchantId: string;
  shopName: string;
  phone: string;
  category: string;
  gstin?: string;
  address?: string;
  lat?: number;
  lng?: number;
  qrCodeBase64?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  mode: string;
  description: string;
  timestamp: string;
}