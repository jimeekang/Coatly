import { defineFeatureModule } from '../module-manifest';

export const QUOTES_MODULE = defineFeatureModule({
  name: 'quotes',
  description: 'Quote creation, approval, pricing, and public quote workflows',
});

export type {
  QuoteDetail,
  QuoteListItem,
  QuoteStatus,
} from './domain/quotes';
