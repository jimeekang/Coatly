import type {
  BusinessDocumentBranding,
  BusinessInvoiceDefaults,
} from '@/modules/settings/domain/businesses';

export type { BusinessDocumentBranding, BusinessInvoiceDefaults };

export {
  getBusinessDocumentBranding,
  getBusinessInvoiceDefaults,
} from '@/modules/settings/infrastructure/businesses';
