import { createElement } from 'react'

function Logo({ light = false, size = 56 }) {
  return createElement('hocluc-logo', {
    size: size <= 36 ? 19 : 21,
    ...(light ? { light: '' } : {}),
    'aria-label': 'hocluc.com',
    role: 'img',
  })
}

export default Logo
