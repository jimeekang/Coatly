import { CUSTOMERS_MODULE } from './customers';
import { INVOICES_MODULE } from './invoices';
import { JOBS_MODULE } from './jobs';
import { MATERIALS_MODULE } from './materials';
import { PRICE_RATES_MODULE } from './price-rates';
import { QUOTES_MODULE } from './quotes';
import { SETTINGS_MODULE } from './settings';

export const DASHBOARD_FEATURE_MODULES = [
  MATERIALS_MODULE,
  CUSTOMERS_MODULE,
  QUOTES_MODULE,
  INVOICES_MODULE,
  JOBS_MODULE,
  PRICE_RATES_MODULE,
  SETTINGS_MODULE,
] as const;

export type { FeatureModuleManifest, FeatureModuleName } from './module-manifest';
