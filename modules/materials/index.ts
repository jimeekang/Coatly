import { defineFeatureModule } from '../module-manifest';

export const MATERIALS_MODULE = defineFeatureModule({
  name: 'materials',
  description: 'Materials and reusable service catalogue',
});

export type {
  MaterialItem,
  MaterialItemCategory,
  MaterialItemUpsertInput,
} from './domain/types';
