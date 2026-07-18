import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getJobDetail } from '@/modules/jobs/application/actions';
import { JOB_STATUS_LABELS } from '@/modules/jobs/domain/jobs';
import { JobDetail } from '@/modules/jobs/ui/JobDetail';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { JOB_STATUS_TONE } from '@/lib/constants/status-colors';

interface Props {
  params: Promise<{ id: string }>;
}

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
            <StatusBadge
              tone={JOB_STATUS_TONE[job.status]}
              label={JOB_STATUS_LABELS[job.status]}
            />
            <Link
              href={`/jobs/${job.id}/edit`}
              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
