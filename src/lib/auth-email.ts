type EmailPurpose = 'verification' | 'reset'

export function pendingAuthEmail(purpose: EmailPurpose) {
  return sessionStorage.getItem(`hocluc.pendingEmail.${purpose}`) || ''
}

export function setPendingAuthEmail(purpose: EmailPurpose, email: string) {
  const key = `hocluc.pendingEmail.${purpose}`
  if (email.trim()) sessionStorage.setItem(key, email.trim())
  else sessionStorage.removeItem(key)
}

export function clearPendingAuthEmails() {
  setPendingAuthEmail('verification', '')
  setPendingAuthEmail('reset', '')
}
