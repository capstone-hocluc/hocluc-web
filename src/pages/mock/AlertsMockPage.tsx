import { useState } from 'react'
import ThemeProvider from '../../components/common/ThemeProvider'
import { useTheme } from '../../components/common/useTheme'
import Alert, { type AlertTone } from '../../components/console/alert'
import Button from '../../components/console/button'
import Notice from '../../components/console/notice'

// Dev-only review sheet for the console Alert: every tone and shape; the button flips the app theme.
const SAMPLES: {
  tone: AlertTone
  title: string
  body: string
  action: string
}[] = [
  {
    tone: 'default',
    title: 'Có phiên bản master data mới.',
    body: 'Bản v1.1 vừa được kích hoạt. Các bài học mới sẽ dùng phân loại của bản này.',
    action: 'Xem thay đổi',
  },
  {
    tone: 'info',
    title: 'Đề đang được xử lý nền.',
    body: 'AI đang đọc đề và Jev gán nhãn từng câu. Bạn có thể rời trang, kết quả sẽ hiện ở tab "Đề đã nạp".',
    action: 'Xem tiến độ',
  },
  {
    tone: 'success',
    title: 'Đã nhập 40 câu vào ngân hàng.',
    body: 'Tất cả câu đã có dạng câu và kỹ năng chính.',
    action: 'Mở ngân hàng câu hỏi',
  },
  {
    tone: 'warning',
    title: 'Còn 3 câu chưa gán dạng câu.',
    body: 'Những câu này chưa dùng được cho bài kiểm tra cho đến khi có dạng câu.',
    action: 'Gán ngay',
  },
  {
    tone: 'danger',
    title: 'Không gửi được đề lên máy chủ.',
    body: 'Kiểm tra kết nối mạng rồi thử lại. Nếu vẫn lỗi, liên hệ quản trị viên.',
    action: 'Thử lại',
  },
]

function ConsoleBoard() {
  const [hidden, setHidden] = useState<AlertTone[]>([])
  return (
    <>
      {SAMPLES.map((sample) => (
        <Alert
          key={sample.tone}
          tone={sample.tone}
          title={sample.title}
          action={
            <>
              <Button size="sm">{sample.action}</Button>
              <Button size="sm" appearance="ghost">
                Để sau
              </Button>
            </>
          }
        >
          {sample.body}
        </Alert>
      ))}
      {SAMPLES.filter((sample) => !hidden.includes(sample.tone)).map((sample) => (
        <Alert
          key={sample.tone}
          tone={sample.tone}
          title={sample.title}
          onDismiss={() => setHidden([...hidden, sample.tone])}
        >
          {sample.body}
        </Alert>
      ))}
      {hidden.length > 0 && (
        <button
          type="button"
          className="w-fit text-sm text-text-tertiary underline"
          onClick={() => setHidden([])}
        >
          Hiện lại
        </button>
      )}
      {SAMPLES.map((sample) => (
        <Alert key={sample.tone} tone={sample.tone} title={sample.title} />
      ))}
      <p className="mt-4 text-sm font-semibold text-text-primary">Notice (một dòng)</p>
      <Notice tone="info">Đã lưu giờ hỗ trợ.</Notice>
      <Notice tone="warning">
        AI sẽ đọc toàn bộ đề và Jev gán nhãn từng câu, việc này tốn token. Đề được xếp hàng và xử lý
        nền.
      </Notice>
      <Notice tone="danger">Năm phải là số từ 2000 đến 2100.</Notice>
      <Notice tone="warning">
        Không tải được môn học.{' '}
        <Button appearance="outline" size="sm">
          Thử lại
        </Button>
      </Notice>
    </>
  )
}

function Page() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="min-h-screen bg-background-gray-secondary p-6 sm:p-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary">Alert</h1>
          <Button appearance="outline" onClick={toggleTheme}>
            {theme === 'dark' ? 'Xem nền sáng' : 'Xem nền tối'}
          </Button>
        </div>
        <ConsoleBoard />
      </div>
    </div>
  )
}

export default function AlertsMockPage() {
  return (
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  )
}
