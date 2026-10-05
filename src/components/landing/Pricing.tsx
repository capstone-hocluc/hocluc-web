import { useState } from 'react'
import { Reveal } from '../common/motion'
import SectionHeading from '../common/SectionHeading'
import { plans } from '../../data/content'

const fmt = (n) => (n === 0 ? 'Miễn phí' : n.toLocaleString('vi-VN') + 'đ')

function Pricing() {
  const [billing, setBilling] = useState('year')

  return (
    <section id="pricing" style={{ scrollMarginTop: 90, padding: '90px 0', background: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px' }}>
        <SectionHeading
          title="Bảng giá"
          banner="Gói linh hoạt"
          subtitle="Chọn gói phù hợp với mục tiêu của bạn — nâng cấp hoặc hủy bất cứ lúc nào."
        />

        <Reveal style={{ display: 'flex', justifyContent: 'center', marginBottom: 42 }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#F0F3FB',
              borderRadius: 40,
              padding: 5,
              gap: 4,
            }}
          >
            {[
              ['month', 'Hàng tháng'],
              ['year', 'Hàng năm · −17%'],
            ].map(([id, label]) => {
              const on = billing === id
              return (
                <button
                  key={id}
                  onClick={() => setBilling(id)}
                  style={{
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 800,
                    fontSize: 13.5,
                    padding: '11px 22px',
                    borderRadius: 40,
                    border: 'none',
                    transition: 'all .25s',
                    background: on ? '#fff' : 'transparent',
                    color: on ? 'var(--color-primary)' : 'var(--color-body)',
                    boxShadow: on ? '0 4px 12px rgba(24,48,68,.12)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal
          className="hl-grid-3"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {plans.map((p) => {
            const pr = billing === 'year' ? p.y : p.m
            const pop = p.popular
            return (
              <div
                key={p.name}
                style={{
                  position: 'relative',
                  border: `1.5px solid ${pop ? 'var(--color-primary)' : '#E4E9F5'}`,
                  borderRadius: 22,
                  padding: '30px 26px',
                  background: pop ? 'linear-gradient(180deg,var(--color-primary),var(--color-primary-dark))' : '#fff',
                  boxShadow: pop
                    ? '0 34px 64px -22px rgba(28, 176, 246,.55)'
                    : '0 18px 40px -28px rgba(28, 176, 246,.4)',
                  transform: pop ? 'translateY(-12px)' : 'none',
                }}
              >
                {pop && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -13,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))',
                      color: 'var(--color-primary-dark)',
                      fontWeight: 800,
                      fontSize: 11,
                      letterSpacing: '.6px',
                      textTransform: 'uppercase',
                      padding: '7px 16px',
                      borderRadius: 30,
                      boxShadow: '0 8px 18px rgba(59,175,218,.5)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ★ Phổ biến nhất
                  </span>
                )}
                <h3
                  style={{
                    margin: '0 0 6px',
                    fontSize: 20,
                    fontWeight: 900,
                    color: pop ? '#fff' : 'var(--color-heading)',
                    textTransform: 'uppercase',
                    letterSpacing: '-.2px',
                  }}
                >
                  {p.name}
                </h3>
                <p
                  style={{
                    margin: '0 0 18px',
                    fontSize: 13.5,
                    color: pop ? 'rgba(255,255,255,.8)' : 'var(--color-body)',
                    lineHeight: 1.5,
                    minHeight: 38,
                  }}
                >
                  {p.desc}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: pop ? '#fff' : 'var(--color-primary)',
                      letterSpacing: '-1px',
                    }}
                  >
                    {fmt(pr)}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: pop ? 'rgba(255,255,255,.7)' : '#9AA2BC',
                    }}
                  >
                    {pr === 0 ? 'trọn đời' : billing === 'year' ? '/năm' : '/tháng'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: pop ? 'var(--color-accent)' : '#1B8A5B',
                    minHeight: 18,
                    marginBottom: 18,
                  }}
                >
                  {p.m > 0 && billing === 'year' ? 'Tiết kiệm ~2 tháng' : ''}
                </div>
                <div
                  style={{
                    height: 1,
                    background: pop ? 'rgba(255,255,255,.18)' : '#EEF1F8',
                    marginBottom: 18,
                  }}
                />
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 24 }}
                >
                  {p.feats.map(([t, on]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: on
                            ? pop
                              ? 'rgba(255,255,255,.22)'
                              : 'var(--color-brand-soft-bg)'
                            : pop
                              ? 'rgba(255,255,255,.1)'
                              : '#F0F1F6',
                          color: on
                            ? pop
                              ? '#fff'
                              : 'var(--color-primary)'
                            : pop
                              ? 'rgba(255,255,255,.5)'
                              : '#C2C8DA',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {on ? '✓' : '✕'}
                      </span>
                      <span
                        style={{
                          fontSize: 13.5,
                          color: on
                            ? pop
                              ? '#fff'
                              : '#2A3354'
                            : pop
                              ? 'rgba(255,255,255,.55)'
                              : '#AAB0C4',
                        }}
                      >
                        {t}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="hl-bb"
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: '.4px',
                    textTransform: 'uppercase',
                    padding: 14,
                    borderRadius: 40,
                    border: `1.5px solid ${pop ? 'transparent' : 'var(--color-primary)'}`,
                    background: pop ? 'linear-gradient(180deg,var(--color-accent),var(--color-accent-dark))' : '#fff',
                    color: pop ? 'var(--color-primary-dark)' : 'var(--color-primary)',
                  }}
                >
                  {p.cta}
                </button>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}

export default Pricing
