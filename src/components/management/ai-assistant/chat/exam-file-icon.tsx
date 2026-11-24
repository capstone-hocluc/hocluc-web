import { FileIcon, defaultStyles, type FileIconProps } from 'react-file-icon'
import { cn } from '../../../../lib/cn'

/** Each kind of file in the colours it is known by: Word blue, PDF red. */
const STYLES: Record<'word' | 'pdf', FileIconProps & { extension: string }> = {
  word: { extension: 'docx', ...defaultStyles.docx },
  pdf: {
    extension: 'pdf',
    ...defaultStyles.pdf,
    color: '#D93831',
    foldColor: '#A9271F',
    glyphColor: 'rgba(255,255,255,0.45)',
    labelColor: '#D93831',
    labelUppercase: true,
  },
}

/**
 * The icon of an exam's Word or PDF file; its width sets its size (`className`, `w-4` by default). `label` prints the
 * file's kind on it ("PDF"), which reads only from about 24px.
 */
export function ExamFileIcon({ format, label = false, className }: { format: 'word' | 'pdf'; label?: boolean; className?: string }) {
  const { extension, ...style } = STYLES[format]
  return (
    <span aria-hidden className={cn('inline-block w-4 shrink-0 leading-none [&>svg]:block', className)}>
      <FileIcon {...style} {...(label ? { extension } : {})} />
    </span>
  )
}
