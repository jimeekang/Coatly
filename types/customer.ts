export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  emails?: string[];
  phones?: string[];
  /** Full street address */
  address: string | null;
  /** City/suburb */
  suburb: string | null;
  /** State e.g. VIC, NSW, QLD */
  state: string | null;
  postcode: string | null;
  properties?: Array<{
    label: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postcode: string;
    notes: string;
  }>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
