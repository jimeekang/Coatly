import { defineFeatureModule } from '../module-manifest';

export const PRICE_RATES_MODULE = defineFeatureModule({
  name: 'price-rates',
  description: 'Rate settings, room pricing presets, and pricing diagnostics',
});

export type {
  UserRateSettings,
} from './domain/rate-settings';
