import Button from '../console/button'

export interface DevQuickAccount {
  label: string
  email: string
}

// Local-only shortcut: one button per seeded account. Callers render it behind `import.meta.env.DEV`.
// `console` swaps the learner dialog styling for the console kit: quiet chips under a dashed rule.
function DevQuickLogin({
  accounts,
  disabled,
  onSelect,
  variant = 'learner',
}: {
  accounts: readonly DevQuickAccount[]
  disabled?: boolean
  onSelect: (account: DevQuickAccount) => void
  variant?: 'learner' | 'console'
}) {
  if (variant === 'console')
    return (
      <section
        className="mt-6 border-t border-dashed border-card-border pt-4"
        aria-labelledby="dev-quick-login-title"
      >
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="dev-quick-login-title" className="text-sm font-semibold text-text-primary">
            Đăng nhập nhanh
          </h2>
          <span className="text-xs text-text-secondary">Chỉ môi trường dev</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {accounts.map((account) => (
            <Button
              key={account.email}
              appearance="outline"
              size="sm"
              disabled={disabled}
              title={account.email}
              className="px-2.5 text-xs"
              onClick={() => onSelect(account)}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </section>
    )

  return (
    <section className="brand-auth-dev-quick" aria-labelledby="dev-quick-login-title">
      <div className="brand-auth-dev-quick-head">
        <h2 id="dev-quick-login-title">Đăng nhập nhanh</h2>
        <span>Chỉ môi trường dev</span>
      </div>
      <div className="brand-auth-dev-quick-grid">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(account)}
          >
            <strong>{account.label}</strong>
            <span>{account.email}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default DevQuickLogin
