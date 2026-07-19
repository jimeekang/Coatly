import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getJobDetail,
  getJobFormOptions,
} from '@/modules/jobs/application/actions';
import { JobEditForm } from '@/modules/jobs/ui/JobEditForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Edit Job' };

export default async function EditJobPage({ params }: Props) {
  const { id } = await params;
  const [{ data: job, error }, { data: formOptions, error: optionsError }] =
    await Promise.all([getJobDetail(id), getJobFormOptions()]);

  if (!job || error) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-6xl">
      <PageHeader
        title="Edit Job"
        subtitle={job.title}
        backHref={`/jobs/${job.id}`}
        backLabel="Back to job"
        className="mb-6"
      />

      {optionsError ? (
        <ErrorAlert>{optionsError}</ErrorAlert>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-5 shadow-sm">
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
