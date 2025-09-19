export type OrderStatus =
  | "received"
  | "triaged"
  | "validating"
  | "needs_fix"
  | "ready_for_approval"
  | "approved"
  | "posted";

export interface OrderSummary {
  product: string;
  plan: string;
  qty: number;
  unitPrice: number;
  startDate: string;
  endDate: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  kentemId: string;
  customerName: string;
  productSummary: string;
  shippingDate: string | null;
  receivedAt: string;
  errors: number;
  warns: number;
  assigned: string | null;
  status: OrderStatus;
  total: number;
}

export interface ContractLine {
  product: string;
  plan: string;
  qty: number;
  unitPrice: number;
  startDate: string;
  endDate: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  kentemId: string;
  customerName: string;
  productSummary: string;
  status: "active" | "inactive" | "pending" | "terminated";
  effectiveFrom: string;
  effectiveTo: string;
  version: number;
  total: number;
  lines: ContractLine[];
}

export interface ContractExtras {
  billing?: {
    billingAddress?: string;
    invoiceCycle?: string;
    paymentMethod?: string;
    paymentTerms?: string;
    taxRate?: string;
    currency?: string;
  };
  contacts?: {
    billing?: { name?: string; email?: string; tel?: string };
    admin?: { name?: string; email?: string };
    tech?: { name?: string; email?: string };
  };
  addresses?: {
    serviceAddress?: string;
    shippingAddress?: string;
  };
  rules?: {
    renewal?: { type?: string; noticePeriodDays?: number };
    cancellation?: { policy?: string };
    discounts?: Array<{ rule: string; value: string }>;
    sla?: Array<{ severity: string; responseHrs: number; restoreHrs: number }>;
  };
  notes?: string[];
  attachments?: Array<{ name: string; type: string; size: string }>;
}

export type TabKey = "orders" | "processing" | "confirmed" | "tenants";
