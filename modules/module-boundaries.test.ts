import { describe, expect, it } from 'vitest';

import { MATERIALS_MODULE } from '@/modules/materials';
import { CUSTOMERS_MODULE } from '@/modules/customers';
import { QUOTES_MODULE } from '@/modules/quotes';
import { INVOICES_MODULE } from '@/modules/invoices';
import { JOBS_MODULE } from '@/modules/jobs';
import { PRICE_RATES_MODULE } from '@/modules/price-rates';
import { SETTINGS_MODULE } from '@/modules/settings';
import { DASHBOARD_FEATURE_MODULES } from '@/modules';

describe('feature module boundaries', () => {
  it('registers the feature modules used by dashboard workflows', () => {
    expect([
      MATERIALS_MODULE.name,
      CUSTOMERS_MODULE.name,
      QUOTES_MODULE.name,
      INVOICES_MODULE.name,
      JOBS_MODULE.name,
      PRICE_RATES_MODULE.name,
      SETTINGS_MODULE.name,
    ]).toEqual([
      'materials',
      'customers',
      'quotes',
      'invoices',
      'jobs',
      'price-rates',
      'settings',
    ]);
    expect(DASHBOARD_FEATURE_MODULES.map((module) => module.name)).toEqual([
      'materials',
      'customers',
      'quotes',
      'invoices',
      'jobs',
      'price-rates',
      'settings',
    ]);
  });
});
