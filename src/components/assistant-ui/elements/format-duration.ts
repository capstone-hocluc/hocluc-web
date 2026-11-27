/** How long a step took, as the chat writes it: "<1 giây", "4,2 giây", "12 giây", "2 phút 5 giây", "1 giờ 3 phút". */
export function formatDuration(ms: number) {
  if (ms < 1000) return '<1 giây'
  const seconds = ms / 1000
  if (seconds < 10) return `${(Math.floor(seconds * 10) / 10).toFixed(1).replace('.', ',')} giây`
  if (seconds < 60) return `${Math.floor(seconds)} giây`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    const rest = Math.floor(seconds % 60)
    return rest ? `${minutes} phút ${rest} giây` : `${minutes} phút`
  }
  const rest = minutes % 60
  return rest ? `${Math.floor(minutes / 60)} giờ ${rest} phút` : `${Math.floor(minutes / 60)} giờ`
}
