import { useState } from 'react'
import { Reveal } from '../common/motion'
import SectionHeading from '../common/SectionHeading'
import { faqs } from '../../data/content'

function FAQ() {
  const [open, setOpen] = useState(1)

  return (
    <section id="faq" style={{ scrollMarginTop: 90, padding: '90px 0', background: '#fff' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px' }}>
        <SectionHeading
          title="Hỏi đáp"
          banner="Câu hỏi thường gặp"
          subtitle="Giải đáp những thắc mắc phổ biến về đánh giá năng lực."
        />

        <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((q, i) => {
            const isOpen = i === open
            return (
              <div
                key={q.question}
                style={{
                  border: `1.5px solid ${isOpen ? 'var(--color-primary)' : '#E4E9F5'}`,
                  borderRadius: 14,
                  background: isOpen ? '#F4F7FE' : '#fff',
                  overflow: 'hidden',
                  transition: 'border-color .3s, background .3s, box-shadow .3s',
                  boxShadow: isOpen ? '0 18px 36px -24px rgba(28, 176, 246,.5)' : 'none',
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 18,
                    padding: '22px 24px',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 15.5,
                      color: 'var(--color-heading)',
                      textTransform: 'uppercase',
                      letterSpacing: '-.2px',
                    }}
                  >
                    {q.question}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: isOpen ? 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))' : 'var(--color-primary)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 20,
                      fontWeight: 700,
                      transition: 'transform .35s, background .3s',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                <div
                  style={{
                    maxHeight: isOpen ? 240 : 0,
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height .4s cubic-bezier(.22,.61,.36,1), opacity .35s',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      padding: '0 24px 24px',
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: 'var(--color-body)',
                    }}
                  >
                    {q.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}

export default FAQ
