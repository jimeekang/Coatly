import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-blue-800 mb-6">Sign in to PaintMate</h1>
        <p className="text-gray-500 text-sm">Login form coming in Phase 0 Week 2.</p>
      </div>
    </main>
  );
}
