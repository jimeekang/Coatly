import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJobDetail, getJobFormOptions } from '@/modules/jobs/application/actions';
import { JobEditForm } from '@/modules/jobs/ui/JobEditForm';
import { PageHeader } from '@/components/layout/PageHeader';

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
      <PageHeader
        title="Edit Job"
        subtitle={job.title}
        backHref={`/jobs/${job.id}`}
        backLabel="Back to job"
        className="mb-6"
      />

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
