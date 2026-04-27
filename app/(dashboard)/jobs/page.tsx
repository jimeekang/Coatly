import { redirect } from 'next/navigation';

export const metadata = { title: 'Jobs' };

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    jobId?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  if (typeof params.jobId === 'string' && params.jobId.length > 0) {
    redirect(`/jobs/${params.jobId}`);
  }

  redirect('/schedule?view=list&source=jobs');
}
