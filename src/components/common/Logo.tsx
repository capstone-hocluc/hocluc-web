import { createElement } from 'react'

function Logo({ light = false, size = 56, markOnly = false }) {
  return createElement('hocluc-logo', {
    size: size <= 36 ? 19 : 21,
    ...(light ? { light: '' } : {}),
    ...(markOnly ? { 'mark-only': '' } : {}),
    'aria-label': 'hocluc.com',
    role: 'img',
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      flexShrink: 0,
      width: 'max-content',
      maxWidth: '100%',
      whiteSpace: 'nowrap',
    },
  })
}

export default Logo
