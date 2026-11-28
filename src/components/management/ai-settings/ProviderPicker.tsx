import type { AiProvider } from '../../../services/aiSettingsService'
import { providers } from './providers'

export default function ProviderPicker({ selected, active, disabled, onSelect }: {
  selected: AiProvider; active: string; disabled: boolean; onSelect: (provider: AiProvider) => void
}) {
  return <div role="radiogroup" aria-label="Nhà cung cấp AI" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {providers.map((provider) => <button key={provider.id} type="button" role="radio" aria-checked={selected === provider.id}
      disabled={disabled} onClick={() => onSelect(provider.id)}
      className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${selected === provider.id ? 'border-brand bg-background-gray-secondary' : 'border-card-border bg-card-background hover:bg-background-gray-secondary'}`}>
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white p-2"><img src={provider.logo} alt="" className="size-full object-contain" /></span>
      <span className="min-w-0"><span className="block text-sm font-semibold text-text-primary">{provider.label}</span>
        {active === provider.id && <span className="mt-1 block text-xs font-medium text-success">Đang hoạt động</span>}</span>
    </button>)}
  </div>
}
