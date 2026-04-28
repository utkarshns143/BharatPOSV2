// File: src/types.ts

export interface MerchantProfile {
  merchantId: string;
  shopName: string;
  category: string;
  mobile: string;
  isBranch: boolean;
  parentId?: string;
  lat?: number;
  lng?: number;
}

export interface AppUser {
  uid: string;
  mobile: string;
  merchantId: string;
  email?: string;
  displayName?: string;
  role: 'admin' | 'staff' | 'merchant';
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface ProductBrand {
  name: string;
}

export interface ProductVariant {
  id: string;
  type?: string;
  brandName?: string;
  quantity: string;
  price: number;
  stock: number;
  baseQty?: number;
  baseUnit?: string;
  barcode?: string;
  costPrice?: number | string;
  expiryDate?: string;
  dateAdded?: string;
  brands?: ProductBrand[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  hsn?: string;
  gstRate?: string | number;
  priceType?: 'inclusive' | 'exclusive';
  batchId?: string;
  isLoose: boolean;
  reorderPoint: number | string;
  dateAdded?: string;
  variants: ProductVariant[];
  _branchId?: string;
  _branchName?: string;
}

export interface CartItem {
  prodId: string;
  variantId: string;
  name: string;
  variantName: string;
  brand?: string | null;
  price: number;
  qty: number;
  isLoose: boolean;
  unitLabel?: string;
  total: number;
}

export interface SplitPayment {
  cash: number;
  online: number;
  udhaar: number;
}

export type PaymentMethod = 'Cash' | 'Online' | 'Udhaar' | 'Partial' | 'Cash (Settled)' | 'Partial (Settled)';

export interface Sale {
  id: string;
  invoiceNo?: string;
  timestamp: string; 
  date?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string; 
  items: CartItem[];
  subTotal?: number;
  discount?: number;
  total: number;
  isPaid: boolean;
  paymentMethod: PaymentMethod;
  split?: SplitPayment;
  settledDate?: string;
  _branchId?: string;
  _branchName?: string;
}

export interface CustomerHistory {
  id: string;
  date: string;
  total: number;
  spent?: number;
  udhaar?: number;
  itemsCount?: number;
  isPaid?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  pendingUdhaar: number;
  history?: CustomerHistory[];
  status?: 'VIP' | 'REGULAR' | 'RISK';
}