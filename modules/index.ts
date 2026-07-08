import { AI_MODULE } from './ai';
import { ASSISTANT_MODULE } from './assistant';
import { AUTH_MODULE } from './auth';
import { BILLING_MODULE } from './billing';
import { CUSTOMERS_MODULE } from './customers';
import { INVOICES_MODULE } from './invoices';
import { JOBS_MODULE } from './jobs';
import { MATERIALS_MODULE } from './materials';
import { ONBOARDING_MODULE } from './onboarding';
import { PRICE_RATES_MODULE } from './price-rates';
import { QUOTES_MODULE } from './quotes';
import { SCHEDULE_MODULE } from './schedule';
import { SETTINGS_MODULE } from './settings';

export const DASHBOARD_FEATURE_MODULES = [
  MATERIALS_MODULE,
  CUSTOMERS_MODULE,
  QUOTES_MODULE,
  INVOICES_MODULE,
  JOBS_MODULE,
  PRICE_RATES_MODULE,
  SETTINGS_MODULE,
  SCHEDULE_MODULE,
  BILLING_MODULE,
  AI_MODULE,
  ASSISTANT_MODULE,
] as const;

export const PLATFORM_FEATURE_MODULES = [AUTH_MODULE, ONBOARDING_MODULE] as const;

export {
  AI_MODULE,
  ASSISTANT_MODULE,
  AUTH_MODULE,
  BILLING_MODULE,
  ONBOARDING_MODULE,
  SCHEDULE_MODULE,
};

export type { FeatureModuleManifest, FeatureModuleName } from './module-manifest';
