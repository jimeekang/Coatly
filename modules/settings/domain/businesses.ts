export type BusinessFormValues = {
  name: string;
  abn: string;
  addressLine1: string;
  city: string;
  state: string;
  postcode: string;
  phone: string;
  email: string;
  paymentTerms: string;
  bankDetails: string;
  logoUrl: string;
  logoPreviewUrl: string;
};

export type BusinessDocumentBranding = {
  name: string;
  abn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoPath: string | null;
  logoUrl: string | null;
};

export type BusinessInvoiceDefaults = {
  business_abn: string | null;
  payment_terms: string | null;
  bank_details: string | null;
};
