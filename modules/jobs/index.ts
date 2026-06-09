import { defineFeatureModule } from '../module-manifest';

export const JOBS_MODULE = defineFeatureModule({
  name: 'jobs',
  description: 'Booked work, job schedules, and job variations',
});

export type {
  JobDetail,
  JobListItem,
  JobStatus,
} from './domain/jobs';
