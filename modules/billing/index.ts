import { defineFeatureModule } from '../module-manifest';

export const BILLING_MODULE = defineFeatureModule({
  name: 'billing',
  description: 'Subscription access policy and Stripe billing integration',
});
