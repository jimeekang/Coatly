export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Full street address */
  address: string | null;
  /** City/suburb */
  suburb: string | null;
  /** State e.g. VIC, NSW, QLD */
  state: string | null;
  postcode: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
