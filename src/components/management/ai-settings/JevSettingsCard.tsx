import Button from '../../console/button'
import Card from '../../console/card'
import Field, { fieldControlClass } from '../../console/form-field'
import Notice from '../../console/notice'
import Skeleton from '../../ui/Skeleton'
import { useJevSettings } from '../../../hooks/useJevSettings'

export default function JevSettingsCard() {
  const state = useJevSettings()
  return (
    <Card className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-text-primary">Gán nhãn (TypeSafe Jev)</h2>
      <p className="text-sm text-text-secondary">Gán nhãn dạng câu và kỹ năng</p>
      {state.loading ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          {state.error && <Notice tone="danger">{state.error}</Notice>}
          {state.message && <Notice>{state.message}</Notice>}
          {!state.available && (
            <Notice tone="warning">
              Máy chủ chưa có khóa mã hóa cho cấu hình AI. Không thể lưu khóa mới.
            </Notice>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Địa chỉ Jev">
              <input
                className={fieldControlClass}
                value={state.form.baseUrl}
                disabled={state.busy}
                onChange={(e) => state.update('baseUrl', e.target.value)}
              />
            </Field>
            <Field label="Model Jev">
              <input
                className={fieldControlClass}
                value={state.form.model}
                disabled={state.busy}
                onChange={(e) => state.update('model', e.target.value)}
              />
            </Field>
            <Field label="Khóa API Jev">
              <input
                className={fieldControlClass}
                type="password"
                autoComplete="off"
                value={state.form.apiKey}
                placeholder={state.masked ? `Đã lưu ${state.masked}` : undefined}
                disabled={state.busy}
                onChange={(e) => state.update('apiKey', e.target.value)}
              />
            </Field>
          </div>
          {state.result && (
            <Notice tone={state.result.ok ? 'info' : 'danger'}>
              {state.result.ok
                ? `Kết nối Jev thành công · ${state.result.model} · ${state.result.latencyMs} ms`
                : state.result.error}
            </Notice>
          )}
          <div className="flex flex-wrap gap-3">
            <Button appearance="outline" disabled={state.busy} onClick={() => void state.test()}>
              Kiểm tra kết nối Jev
            </Button>
            <Button disabled={state.busy} onClick={() => void state.save()}>
              Lưu Jev
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
