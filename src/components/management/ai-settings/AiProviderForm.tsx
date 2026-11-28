import Field, { fieldControlClass } from '../../console/form-field'
import type { AiSettingsForm } from '../../../services/aiSettingsService'

type TextField = Exclude<keyof AiSettingsForm, 'provider' | 'vision'>
export default function AiProviderForm({
  form,
  secrets,
  disabled,
  onChange,
}: {
  form: AiSettingsForm
  secrets: Record<string, string>
  disabled: boolean
  onChange: <K extends keyof AiSettingsForm>(key: K, value: AiSettingsForm[K]) => void
}) {
  const field = (key: TextField, label: string, secret = false) => (
    <Field key={key} label={label}>
      <input
        className={fieldControlClass}
        type={secret ? 'password' : 'text'}
        autoComplete="off"
        value={form[key]}
        disabled={disabled}
        onChange={(event) => onChange(key, event.target.value)}
        placeholder={secret && secrets[key] ? `Đã lưu ${secrets[key]}` : undefined}
      />
    </Field>
  )
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {form.provider !== 'bedrock' &&
        field('apiKey', form.provider === 'compatible' ? 'Khóa API (tùy chọn)' : 'Khóa API', true)}
      {form.provider === 'bedrock' && (
        <>
          {field('accessKeyId', 'Access key ID', true)}
          {field('secretAccessKey', 'Secret access key', true)}
          {field('sessionToken', 'Session token (tùy chọn)', true)}
          {field('region', 'Khu vực AWS')}
        </>
      )}
      {form.provider === 'cloudflare' && field('accountId', 'Account ID')}
      {form.provider === 'compatible' && field('baseUrl', 'Địa chỉ API')}
      {form.provider === 'openai' && (
        <>
          {field('organization', 'Organization ID (tùy chọn)')}
          {field('project', 'Project ID (tùy chọn)')}
        </>
      )}
      {field('model', 'Model')}
      {field('reviewModel', 'Model kiểm tra bài đọc (tùy chọn)')}
      {field('secondReviewModel', 'Model kiểm tra lần hai (tùy chọn)')}
      {(form.provider === 'openai' ||
        form.provider === 'cloudflare' ||
        form.provider === 'compatible') && (
        <label className="flex items-center gap-3 self-end py-3 text-sm font-medium text-text-primary">
          <input
            type="checkbox"
            checked={form.vision}
            disabled={disabled}
            onChange={(event) => onChange('vision', event.target.checked)}
          />{' '}
          Model hỗ trợ ảnh
        </label>
      )}
    </div>
  )
}
