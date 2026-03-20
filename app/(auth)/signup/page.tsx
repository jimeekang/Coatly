import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign Up' };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-blue-800 mb-6">Create your PaintMate account</h1>
        <p className="text-gray-500 text-sm">Signup form coming in Phase 0 Week 2.</p>
      </div>
    </main>
  );
}
