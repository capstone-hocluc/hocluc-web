export interface DevQuickAccount {
  label: string
  email: string
}

// Local-only shortcut: one button per seeded account. Callers render it behind `import.meta.env.DEV`.
function DevQuickLogin({
  accounts,
  disabled,
  onSelect,
}: {
  accounts: readonly DevQuickAccount[]
  disabled?: boolean
  onSelect: (account: DevQuickAccount) => void
}) {
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
