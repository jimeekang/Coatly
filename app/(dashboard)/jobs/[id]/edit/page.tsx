import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJobDetail, getJobFormOptions } from '@/app/actions/jobs';
import { JobEditForm } from '@/components/jobs/JobEditForm';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Edit Job' };

export default async function EditJobPage({ params }: Props) {
  const { id } = await params;
  const [{ data: job, error }, { data: formOptions, error: optionsError }] = await Promise.all([
    getJobDetail(id),
    getJobFormOptions(),
  ]);

  if (!job || error) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/jobs/${job.id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high"
          aria-label="Back to job"
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
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Edit Job</h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">{job.title}</p>
        </div>
      </div>

      {optionsError ? (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{optionsError}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-outline-variant bg-white p-5 shadow-sm">
            <JobEditForm
              job={job}
              customers={formOptions.customers}
              quotes={formOptions.quotes}
              initialVariations={job.variations}
            />
          </div>
        </div>
      )}
    </div>
  );
}
