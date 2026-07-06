
export enum ContactType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER'
}

export interface Transaction {
  id: string;
  type: 'DUE_GIVEN' | 'RECEIVED';
  amount: number;
  description: string;
  date: string;
  recordId?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  balance: number; // Positive means receivable (from customer), Negative means payable (to supplier)
  lastActivity: string;
  transactions: Transaction[];
  photo?: string;
  address?: string;
  lastReminderDate?: string;
  reminderCount?: number;
  invitationCount?: number;
}

export interface SalePurchaseRecord {
  id: string;
  type: 'SALE' | 'PURCHASE' | 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';
  amount: number;
  description: string;
  date: string;
  isCash: boolean;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items?: { 
    productId: string; 
    name: string; 
    quantity: number; 
    price: number; 
    selectedSerials?: string[];
    discount?: number;
  }[];
  paidAmount?: number;
  dueAmount?: number;
  discount?: number;
  discountType?: 'FIXED' | 'PERCENT';
  invoiceImage?: string;
}

export interface StockItem {
  id: string;
  name: string;
  serialNumber?: string;
  serialNumbers?: string[];
  quantity: number;
  unit: string;
  buyingPrice: number;
  previousBuyingPrice?: number;
  sellingPrice: number;
  lastUpdated: string;
  image?: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'IN' | 'OUT' | 'RETURN_IN' | 'RETURN_OUT';
  quantity: number;
  price: number;
  date: string;
  partyName: string; // Supplier for IN, Customer for OUT
  invoiceImage?: string;
  selectedSerials?: string[];
}

export interface ShopSettings {
  shopName: string;
  shopAddress: string;
  shopPhone?: string;
  shopLogo?: string;
  shopDescription?: string;
  paymentMethod?: string;
  signatureName?: string;
  termsAndConditions?: string;
  invoiceColor?: string;
  reminderTemplates?: string[];
  invitationTemplates?: string[];
}

export enum WarrantyStatus {
  RECEIVED_FROM_CUSTOMER = 'RECEIVED_FROM_CUSTOMER', // কাস্টমার থেকে গৃহীত
  SENT_TO_SUPPLIER = 'SENT_TO_SUPPLIER',             // সাপ্লায়ারের কাছে পাঠানো
  RECEIVED_FROM_SUPPLIER = 'RECEIVED_FROM_SUPPLIER', // সাপ্লায়ার থেকে রিসিভড
  DELIVERED_TO_CUSTOMER = 'DELIVERED_TO_CUSTOMER'    // কাস্টমারকে বুঝিয়ে দেওয়া হয়েছে
}

export interface WarrantyItem {
  id: string;
  customerName: string;
  customerPhone: string;
  productId?: string;
  productName: string;
  productImage?: string; // Base64 or Drive URI
  serialNumber?: string;
  issueDescription: string;
  supplierId?: string; // Selected supplier id if any
  supplierName?: string; // Selected supplier name if any
  status: WarrantyStatus;
  receivedDate: string;
  sentToSupplierDate?: string;
  receivedFromSupplierDate?: string;
  deliveredToCustomerDate?: string;
  notes?: string;
}

export type ViewState = 'TALLY' | 'CASHBOX' | 'WALLET' | 'MENU' | 'ADD_CONTACT' | 'CONTACT_DETAILS' | 'BECHA_KENA' | 'CLOUD_BACKUP' | 'AI_CHAT' | 'AI_RECOMMENDATIONS' | 'STOCK' | 'SALE_ENTRY' | 'CUSTOMERS' | 'SUPPLIERS' | 'HELP_SUPPORT' | 'PRODUCT_RETURN';
