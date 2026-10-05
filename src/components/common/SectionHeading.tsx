import { Reveal } from './motion'

function SectionHeading({ title, banner, subtitle }) {
  return (
    <Reveal style={{ textAlign: 'center', marginBottom: 34 }}>
      <h2
        style={{
          fontSize: 'clamp(34px,4.4vw,56px)',
          fontWeight: 900,
          color: 'var(--color-primary)',
          letterSpacing: '-1px',
          margin: '0 0 16px',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h2>
      {banner && (
        <span
          style={{
            display: 'inline-block',
            background: 'linear-gradient(90deg,var(--color-primary),var(--color-brand-bright))',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '9px 22px',
            borderRadius: 40,
            boxShadow: '0 10px 22px rgba(28, 176, 246,.28)',
          }}
        >
          {banner}
        </span>
      )}
      {subtitle && (
        <p style={{ color: 'var(--color-body)', fontSize: 16, margin: '18px auto 0', maxWidth: 580 }}>
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}

export default SectionHeading
