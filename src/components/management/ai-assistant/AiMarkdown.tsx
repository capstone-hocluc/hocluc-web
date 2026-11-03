import { memo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface AiMarkdownProps {
  content: string
  /** Body copy is 16px/1.75; compact keeps the size of the card it sits in. */
  variant?: 'body' | 'compact'
  className?: string
}

// Parsing markdown and typesetting KaTeX is the costly part of a chat render; the props are plain
// values, so a parent re-render (e.g. while a panel divider is dragged) skips it.
export default memo(AiMarkdown)

function AiMarkdown({
  content,
  variant = 'body',
  className = '',
}: AiMarkdownProps) {
  const compact = variant === 'compact'
  const p = compact ? 'my-1.5 first:mt-0 last:mb-0' : 'mb-4 last:mb-0'
  const list = compact ? 'my-2 space-y-1 pl-5' : 'mb-4 space-y-1.5 pl-5'
  const heading = compact
    ? 'mt-3 mb-1.5 text-[15px] font-bold text-text-primary first:mt-0'
    : 'mt-6 mb-2 text-[17px] font-bold text-text-primary first:mt-0'

  return (
    <div className={`${className} [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }: { children?: ReactNode }) => <h3 className={heading}>{children}</h3>,
          h2: ({ children }: { children?: ReactNode }) => <h3 className={heading}>{children}</h3>,
          h3: ({ children }: { children?: ReactNode }) => <h3 className={heading}>{children}</h3>,
          h4: ({ children }: { children?: ReactNode }) => <h4 className={heading}>{children}</h4>,
          p: ({ children }: { children?: ReactNode }) => <p className={p}>{children}</p>,
          ul: ({ children }: { children?: ReactNode }) => (
            <ul className={`${list} list-disc marker:text-text-tertiary`}>{children}</ul>
          ),
          ol: ({ children }: { children?: ReactNode }) => (
            <ol className={`${list} list-decimal marker:text-text-tertiary`}>{children}</ol>
          ),
          li: ({ children }: { children?: ReactNode }) => (
            <li className="pl-0.5 [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</li>
          ),
          strong: ({ children }: { children?: ReactNode }) => (
            <strong className="font-bold text-text-primary">{children}</strong>
          ),
          a: ({ href, children }: { href?: string; children?: ReactNode }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary-text underline underline-offset-2"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }: { children?: ReactNode }) => (
            <blockquote className="my-3 border-l-2 border-card-border pl-3 text-text-secondary">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClass, children }: { className?: string; children?: ReactNode }) => (
            <code
              className={`rounded bg-background-gray-secondary px-1.5 py-0.5 text-[0.92em] text-text-primary ${
                codeClass?.startsWith('language-') ? 'bg-transparent p-0' : ''
              }`}
            >
              {children}
            </code>
          ),
          pre: ({ children }: { children?: ReactNode }) => (
            <pre className="my-3 overflow-x-auto rounded-lg border border-card-border bg-background-gray-secondary p-3 text-[13px] leading-6">
              {children}
            </pre>
          ),
          table: ({ children }: { children?: ReactNode }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-[0.92em]">{children}</table>
            </div>
          ),
          th: ({ children }: { children?: ReactNode }) => (
            <th className="border border-card-border bg-background-gray-secondary px-3 py-2 text-left font-semibold text-text-primary">
              {children}
            </th>
          ),
          td: ({ children }: { children?: ReactNode }) => (
            <td className="border border-card-border px-3 py-2 text-text-secondary">{children}</td>
          ),
          hr: () => <hr className="my-4 border-card-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
