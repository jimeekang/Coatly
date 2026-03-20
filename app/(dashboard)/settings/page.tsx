import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
      <p className="text-gray-500">Business profile settings coming in Phase 0 Week 2.</p>
    </div>
  );
}
