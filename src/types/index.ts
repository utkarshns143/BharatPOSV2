// --- USER & SHOP SCHEMAS ---
export interface ShopProfile {
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
  role: 'admin' | 'staff';
}

// --- INVENTORY SCHEMAS ---
export interface ProductBrand {
  name: string;
}

export interface ProductVariant {
  id: string;
  quantity: string;
  price: number;
  stock: number;
  barcode?: string;
  expiryDate?: string;
  baseQty?: number;
  baseUnit?: string;
  brands?: ProductBrand[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  isLoose: boolean;
  reorderPoint: number;
  variants: ProductVariant[];
  _branchId?: string;
  _branchName?: string;
}

// --- BILLING & SALES SCHEMAS ---
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
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  subTotal: number;
  discount: number;
  total: number;
  isPaid: boolean;
  paymentMethod: PaymentMethod;
  split?: SplitPayment;
  settledDate?: string;
  _branchId: string;
  _branchName: string;
}

// --- CRM SCHEMAS ---
export interface CustomerHistory {
  id: string;
  date: string;
  total: number;
  spent: number;
  udhaar: number;
  itemsCount: number;
  isPaid: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  pendingUdhaar: number;
  history: CustomerHistory[];
  status?: 'VIP' | 'REGULAR' | 'RISK';
} 