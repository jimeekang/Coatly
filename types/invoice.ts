export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceType = 'deposit' | 'progress' | 'final' | 'standard';

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  /** Unit price in AUD cents (ex-GST) */
  unit_price_cents: number;
  /** Line total in AUD cents (ex-GST) */
  line_total_cents: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  /** Linked quote (optional — invoices can be standalone) */
  quote_id: string | null;
  customer_id: string;
  /** Sequential invoice number e.g. INV-0042 */
  invoice_number: string;
  status: InvoiceStatus;
  /** Type of invoice in a progress billing sequence */
  invoice_type: InvoiceType;
  /** For deposit invoices: percentage of quote total */
  deposit_percentage: number | null;
  line_items: InvoiceLineItem[];
  /** Subtotal in AUD cents (ex-GST) */
  subtotal_cents: number;
  /** GST amount in AUD cents */
  gst_cents: number;
  /** Total amount due in AUD cents (inc-GST) */
  total_cents: number;
  /** Amount already paid in AUD cents */
  paid_cents: number;
  /** Balance remaining in AUD cents */
  balance_cents: number;
  /** Invoice issue date (ISO string) */
  issue_date: string;
  /** Payment due date (ISO string) */
  due_date: string;
  /** Date payment was received (ISO string) */
  paid_at: string | null;
  /** Payment instructions / bank details shown on invoice */
  payment_instructions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'line_items'>;
export type InvoiceUpdate = Partial<Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'line_items'>>;

/** Full invoice with joined customer data */
export interface InvoiceWithCustomer extends Invoice {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}
