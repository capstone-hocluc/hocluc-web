import { useEffect, useState } from 'react'
import { getBankPaperPage } from '../../../services/questionBankService'

/** One page of the paper as an object URL, fetched with the session and freed when no longer shown. */
export function usePageImage(sourceId: string, page: number, enabled: boolean) {
  const [image, setImage] = useState<{ key: string; url: string | null; failed: boolean }>({ key: '', url: null, failed: false })
  const key = `${sourceId}#${page}`
  useEffect(() => {
    if (!enabled) return
    let url: string | null = null
    let cancelled = false
    getBankPaperPage(sourceId, page)
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImage({ key, url, failed: false })
      })
      .catch(() => {
        if (!cancelled) setImage({ key, url: null, failed: true })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [sourceId, page, enabled, key])
  return image.key === key ? image : { key, url: null, failed: false }
}
