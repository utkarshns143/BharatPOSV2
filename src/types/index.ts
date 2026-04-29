// File: src/types/index.ts

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

// --- INVENTORY SCHEMAS (UPGRADED FROM JS VERSION) ---
export interface ProductBrand {
  name: string;
}

export interface ProductVariant {
  id: string;
  type?: string;          // NEW: Hierarchical Type (e.g., "Biscuit")
  brandName?: string;     // NEW: Hierarchical Brand (e.g., "Parle-G")
  quantity: string;       // Existing: Display Name (e.g., "Biscuit - Parle-G")
  price: number;
  stock: number;
  baseQty?: number;
  baseUnit?: string;
  barcode?: string;
  costPrice?: number | string; // NEW: Cost tracking for FinanceHQ
  expiryDate?: string;    // NEW: Expiry tracking
  dateAdded?: string;     // NEW: Date added for "Newest" filtering
  brands?: ProductBrand[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  hsn?: string;           // NEW: HSN Code
  gstRate?: string | number; // NEW: GST %
  priceType?: 'inclusive' | 'exclusive'; // NEW: Tax handling
  batchId?: string;       // NEW: Lot/Batch No.
  isLoose: boolean;
  reorderPoint: number | string;
  dateAdded?: string;     // NEW: For Sorting
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
  // --- ADD THESE MISSING PROPERTIES ---
  gstRate?: number;
  priceType?: 'inclusive' | 'exclusive';
  isService?: boolean;
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