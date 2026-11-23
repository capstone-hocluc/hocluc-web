import { useId, type ReactNode } from 'react'

// One part of a course description as its own section: its heading, any text the description puts
// under the heading, the part itself, and the sentences that follow it as a quiet footnote.
export default function PartSection({
  heading,
  lines,
  notes,
  children,
}: {
  heading: string | null
  lines: string[]
  notes: string[]
  children: ReactNode
}) {
  const id = useId()
  return (
    <section className="cd-block sc-part" aria-labelledby={heading ? id : undefined}>
      {heading && <h2 id={id}>{heading}</h2>}
      {lines.map((line, index) => (
        <p key={index} className="sc-lines">
          {line}
        </p>
      ))}
      {children}
      {notes.length > 0 && (
        <div className="sc-notes">
          {notes.map((note, index) => (
            <p key={index}>{note}</p>
          ))}
        </div>
      )}
    </section>
  )
}
