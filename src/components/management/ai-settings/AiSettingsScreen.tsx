import Button from '../../console/button'
import Card from '../../console/card'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import { useAiSettings } from '../../../hooks/useAiSettings'
import ProviderPicker from './ProviderPicker'
import { providers } from './providers'
import AiProviderForm from './AiProviderForm'
import AiSettingsSkeleton from './AiSettingsSkeleton'

export default function AiSettingsScreen() {
  const state = useAiSettings()
  return <section className="flex flex-col gap-5">
    <PageHeading title="Cấu hình AI" />
    {state.loading ? <AiSettingsSkeleton /> : <>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.message && <Notice>{state.message}</Notice>}
      {!state.secretSavingAvailable && <Notice tone="warning">Máy chủ chưa có khóa mã hóa cho cấu hình AI. Không thể lưu khóa mới.</Notice>}
      <ProviderPicker selected={state.form.provider} active={state.active} disabled={state.busy} onSelect={(provider) => void state.load(provider)} />
      <Card className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-text-primary">{providers.find((provider) => provider.id === state.form.provider)?.label}</h2>
        {(state.form.provider === 'cloudflare' || state.form.provider === 'compatible') && <Notice tone="info">PDF được chuyển thành ảnh; chọn model hỗ trợ ảnh để đọc đề thi.</Notice>}
        {state.form.provider === 'bedrock' && <Notice tone="info">Tích hợp Bedrock hiện dùng model Claude hỗ trợ Messages API.</Notice>}
        <AiProviderForm form={state.form} secrets={state.secrets} disabled={state.busy} onChange={state.update} />
        {state.result && <Notice tone={state.result.ok ? 'info' : 'danger'}>{state.result.ok ? `Kết nối thành công · ${state.result.model} · ${state.result.latencyMs} ms` : state.result.error}</Notice>}
        <div className="flex flex-wrap gap-3"><Button appearance="outline" disabled={state.busy} onClick={() => void state.test()}>Kiểm tra kết nối</Button>
          <Button disabled={state.busy} onClick={() => void state.save()}>Lưu</Button></div>
      </Card>
    </>}
  </section>
}
