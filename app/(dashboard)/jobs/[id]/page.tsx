import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJobDetail } from '@/app/actions/jobs';
import { JobDetail } from '@/components/jobs/JobDetail';

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
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/jobs"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high"
          aria-label="Back to jobs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            All jobs
          </p>
        </div>
      </div>

      <JobDetail job={job} />
    </div>
  );
}
