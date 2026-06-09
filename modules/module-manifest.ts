export type FeatureModuleName =
  | 'materials'
  | 'customers'
  | 'quotes'
  | 'invoices'
  | 'jobs'
  | 'price-rates'
  | 'settings';

export interface FeatureModuleManifest {
  readonly name: FeatureModuleName;
  readonly description: string;
}

export function defineFeatureModule(manifest: FeatureModuleManifest) {
  return manifest;
}
