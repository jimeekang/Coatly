import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getJobDetail } from '@/modules/jobs/application/actions';
import { JOB_STATUS_LABELS } from '@/modules/jobs/domain/jobs';
import { JobDetail } from '@/modules/jobs/ui/JobDetail';
import { PageHeader } from '@/components/layout/PageHeader';

interface Props {
  params: Promise<{ id: string }>;
}

const JOB_STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-primary/10 text-primary',
  in_progress: 'bg-warning-container text-warning',
  completed: 'bg-success-container text-success',
  cancelled: 'bg-error-container text-error',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getJobDetail(id);
  return { title: data?.title ?? 'Job' };
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: job, error } = await getJobDetail(id);

  if (!job || error) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-4xl">
      <PageHeader
        title={job.title}
        subtitle={job.customer.company_name || job.customer.name}
        backHref="/jobs"
        backLabel="All jobs"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded px-2.5 py-1 text-[10.5px] font-bold tracking-[0.14em] uppercase ${
                JOB_STATUS_BADGE[job.status] ?? 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {JOB_STATUS_LABELS[job.status]}
            </span>
            <Link
              href={`/jobs/${job.id}/edit`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
              Edit
            </Link>
          </div>
        }
        className="mb-6"
      />

      <JobDetail job={job} showHeader={false} />
    </div>
  );
}
