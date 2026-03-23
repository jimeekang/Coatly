import type Stripe from 'stripe';
import { STRIPE_PRICE_IDS } from '@/lib/stripe/plans';

const MANAGED_PORTAL_CONFIGURATION_NAME = 'Coatly self-serve billing';
const MANAGED_PORTAL_CONFIGURATION_KEY = 'paintmate_managed_billing_portal';

let portalConfigurationPromise: Promise<string> | null = null;

type ProductCatalog = Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.Product[];
type CatalogPrice = Pick<Stripe.Price, 'active' | 'id' | 'product' | 'recurring'>;

function getConfiguredPriceIds(): string[] {
  const priceIds = new Set<string>();

  for (const planPrices of Object.values(STRIPE_PRICE_IDS)) {
    for (const priceId of Object.values(planPrices)) {
      if (priceId) {
        priceIds.add(priceId);
      }
    }
  }

  return [...priceIds];
}

export function buildProductCatalogFromPrices(prices: CatalogPrice[]): ProductCatalog {
  const grouped = new Map<string, Set<string>>();
  const intervalsByProduct = new Map<string, Set<Stripe.Price.Recurring.Interval>>();

  for (const price of prices) {
    if (!price.active || !price.recurring?.interval) {
      continue;
    }

    const productId =
      typeof price.product === 'string' ? price.product : price.product.id;

    if (!grouped.has(productId)) {
      grouped.set(productId, new Set<string>());
    }

    if (!intervalsByProduct.has(productId)) {
      intervalsByProduct.set(productId, new Set<Stripe.Price.Recurring.Interval>());
    }

    const knownIntervals = intervalsByProduct.get(productId);
    if (knownIntervals?.has(price.recurring.interval)) {
      throw new Error(
        `Stripe billing portal catalog cannot include multiple ${price.recurring.interval} prices for product ${productId}.`
      );
    }

    knownIntervals?.add(price.recurring.interval);
    grouped.get(productId)?.add(price.id);
  }

  if (grouped.size === 0) {
    throw new Error('No recurring Stripe prices configured for the billing portal catalog');
  }

  return [...grouped.entries()].map(([product, priceSet]) => ({
    product,
    prices: [...priceSet],
  }));
}

async function buildProductCatalog(stripe: Stripe): Promise<ProductCatalog> {
  const priceIds = getConfiguredPriceIds();

  if (priceIds.length === 0) {
    throw new Error('No Stripe prices configured for the billing portal catalog');
  }

  const prices = await Promise.all(
    priceIds.map((priceId) => stripe.prices.retrieve(priceId))
  );

  return buildProductCatalogFromPrices(prices);
}

function getPortalConfigurationParams(
  products: ProductCatalog
): Stripe.BillingPortal.ConfigurationCreateParams {
  return {
    name: MANAGED_PORTAL_CONFIGURATION_NAME,
    metadata: {
      managed_by: MANAGED_PORTAL_CONFIGURATION_KEY,
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        products,
        proration_behavior: 'always_invoice',
        schedule_at_period_end: {
          conditions: [
            { type: 'decreasing_item_amount' },
            { type: 'shortening_interval' },
          ],
        },
      },
    },
  };
}

async function findManagedPortalConfiguration(stripe: Stripe): Promise<string | null> {
  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });

  const managed = configurations.data.find(
    (configuration) =>
      configuration.metadata?.managed_by === MANAGED_PORTAL_CONFIGURATION_KEY
  );

  return managed?.id ?? null;
}

async function createOrUpdateManagedPortalConfiguration(stripe: Stripe): Promise<string> {
  const products = await buildProductCatalog(stripe);
  const params = getPortalConfigurationParams(products);
  const existingConfigurationId = await findManagedPortalConfiguration(stripe);

  if (existingConfigurationId) {
    const updatedConfiguration = await stripe.billingPortal.configurations.update(
      existingConfigurationId,
      params
    );
    return updatedConfiguration.id;
  }

  const createdConfiguration = await stripe.billingPortal.configurations.create(params);
  return createdConfiguration.id;
}

export async function ensureManagedPortalConfiguration(stripe: Stripe): Promise<string> {
  if (!portalConfigurationPromise) {
    portalConfigurationPromise = createOrUpdateManagedPortalConfiguration(stripe).catch(
      (error) => {
        portalConfigurationPromise = null;
        throw error;
      }
    );
  }

  return portalConfigurationPromise;
}
