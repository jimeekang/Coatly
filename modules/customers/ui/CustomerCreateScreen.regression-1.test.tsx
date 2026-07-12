import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerCreateScreen } from '@/modules/customers/ui/CustomerCreateScreen';

vi.mock('@/modules/customers/ui/CustomerForm', () => ({
  CustomerForm: () => <div>Manual Customer Form</div>,
}));

const StubAIDraftPanel = () => <div>AI Draft Panel</div>;
const StubUpgradePrompt = () => <div>AI Upgrade Prompt</div>;

// Regression: ISSUE-002 - provider-disabled builds exposed active AI controls
// Found by /qa on 2026-07-12
// Report: .gstack/qa-reports/qa-report-localhost-3000-2026-07-12.md
describe('CustomerCreateScreen AI availability', () => {
  it('keeps the manual form available without rendering AI surfaces', () => {
    render(
      <CustomerCreateScreen
        canUseAI={false}
        showAIUpgrade={false}
        generateAIDraft={vi.fn()}
        AIDraftPanel={StubAIDraftPanel}
        UpgradePrompt={StubUpgradePrompt}
      />
    );

    expect(screen.getByText('Manual Customer Form')).toBeInTheDocument();
    expect(screen.queryByText('AI Draft Panel')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Upgrade Prompt')).not.toBeInTheDocument();
  });
});
