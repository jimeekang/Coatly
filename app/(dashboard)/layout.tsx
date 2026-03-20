import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === 'development';

  let userEmail: string | null = null;

  if (!isDev) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    userEmail = user.email ?? null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden md:flex w-56 flex-col bg-blue-900 text-white p-4">
        <div className="text-xl font-bold mb-8">PaintMate</div>
        <nav className="flex flex-col gap-2 text-sm">
          <a href="/" className="px-3 py-2 rounded hover:bg-blue-800">Dashboard</a>
          <a href="/quotes" className="px-3 py-2 rounded hover:bg-blue-800">Quotes</a>
          <a href="/invoices" className="px-3 py-2 rounded hover:bg-blue-800">Invoices</a>
          <a href="/customers" className="px-3 py-2 rounded hover:bg-blue-800">Customers</a>
          <a href="/settings" className="px-3 py-2 rounded hover:bg-blue-800">Settings</a>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">PaintMate</h1>
          <span className="text-sm text-gray-500">
            {userEmail ?? (isDev ? 'dev@paintmate.local' : '')}
          </span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
