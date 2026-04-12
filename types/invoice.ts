export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'full' | 'deposit' | 'progress' | 'final';
export type InvoicePaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'card'
  | 'cheque'
  | 'other';

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  gst_cents: number;
  total_cents: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string;
  quote_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  invoice_type: InvoiceType;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  business_abn: string | null;
  payment_terms: string | null;
  bank_details: string | null;
  due_date: string | null;
  paid_date: string | null;
  paid_at: string | null;
  payment_method: InvoicePaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface InvoiceWithCustomer extends Invoice {
  customer: InvoiceCustomerSummary;
  line_items: InvoiceLineItem[];
}

export interface InvoiceListItem extends Invoice {
  customer: InvoiceCustomerSummary;
  balance_cents: number;
  line_item_count: number;
}
