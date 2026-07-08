import { defineFeatureModule } from '../module-manifest';

export const INVOICES_MODULE = defineFeatureModule({
  name: 'invoices',
  description: 'Invoice drafting, payment tracking, and customer-facing invoice views',
});

export type { InvoiceSummary } from './domain/invoices';
export type { InvoiceListItem, InvoiceWithCustomer } from './domain/invoice';
