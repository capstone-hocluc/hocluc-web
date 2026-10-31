export function courseImageSrc(value: string | null | undefined): string | null {
  const src = value?.trim() ?? ''
  return /^https?:\/\//i.test(src) || (src.startsWith('/') && !src.startsWith('//')) ? src : null
}

