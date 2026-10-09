export function scheduleKindLabel(kind: string) {
  return kind === 'classSession' ? 'Buổi trong chuỗi' : kind === 'liveClass' ? 'Lớp trực tuyến' : 'Lịch đơn'
}
