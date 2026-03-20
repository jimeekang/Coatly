import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PaintMate — Job Management for Australian Painters',
};

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-blue-800 mb-4">PaintMate</h1>
        <p className="text-gray-600 mb-8">
          Quote, invoice, and manage customers — built for Australian painters.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-blue-700 px-6 py-3 text-white font-semibold hover:bg-blue-800 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-blue-700 px-6 py-3 text-blue-700 font-semibold hover:bg-blue-50 transition-colors"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </main>
  );
}
