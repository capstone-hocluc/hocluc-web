// Console menu switches for features whose scope is not settled yet.
// mentorAsk: shows the "Hỏi Mentor" screens of the console roles in the menu. The learner's
// own entry is gated by VITE_MENTOR_CHAT_ENABLED (see chat-feature-gate).
// unfinishedPages: menu entries marked `soon` have no screen yet (only the "Đang phát triển"
// placeholder). Off keeps them out of the menu; turn on to list them again.
export const FEATURE_FLAGS = {
  mentorAsk: true,
  unfinishedPages: false,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag) {
  return FEATURE_FLAGS[flag]
}
