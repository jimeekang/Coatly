import { describe, expect, it } from 'vitest';
import { buildProductCatalogFromPrices } from '@/lib/stripe/portal';

function recurring(interval: 'month' | 'year') {
  return {
    interval,
    interval_count: 1,
    meter: null,
    trial_period_days: null,
    usage_type: 'licensed' as const,
  };
}

describe('buildProductCatalogFromPrices', () => {
  it('groups recurring prices by product when each interval is unique', () => {
    const catalog = buildProductCatalogFromPrices([
      {
        id: 'price_starter_monthly',
        active: true,
        product: 'prod_starter',
        recurring: recurring('month'),
      },
      {
        id: 'price_starter_annual',
        active: true,
        product: 'prod_starter',
        recurring: recurring('year'),
      },
      {
        id: 'price_pro_monthly',
        active: true,
        product: 'prod_pro',
        recurring: recurring('month'),
      },
      {
        id: 'price_pro_annual',
        active: true,
        product: 'prod_pro',
        recurring: recurring('year'),
      },
    ]);

    expect(catalog).toEqual([
      {
        product: 'prod_starter',
        prices: ['price_starter_monthly', 'price_starter_annual'],
      },
      {
        product: 'prod_pro',
        prices: ['price_pro_monthly', 'price_pro_annual'],
      },
    ]);
  });

  it('throws when a product has duplicate recurring intervals', () => {
    expect(() =>
      buildProductCatalogFromPrices([
        {
          id: 'price_starter_monthly',
          active: true,
          product: 'prod_subscription',
          recurring: recurring('month'),
        },
        {
          id: 'price_pro_monthly',
          active: true,
          product: 'prod_subscription',
          recurring: recurring('month'),
        },
      ])
    ).toThrow(
      'Stripe billing portal catalog cannot include multiple month prices for product prod_subscription.'
    );
  });
});
