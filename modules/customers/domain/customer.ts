export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Full site address */
  address: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  /** Full site address */
  address?: string | null;
  notes?: string | null;
}

export interface CustomerUpdateInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  /** Full site address */
  address?: string | null;
  notes?: string | null;
}

export interface CustomerResponse {
  data: Customer;
}

export interface CustomersResponse {
  data: Customer[];
}

export interface CustomerErrorResponse {
  error: string;
}
