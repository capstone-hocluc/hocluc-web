// Console menu switches for features whose scope is not settled yet.
// mentorAsk: the learner's "Hỏi Mentor" request is PENDING (D11). The chat screens stay
// in the code; this only keeps them out of the menu.
export const FEATURE_FLAGS = {
  mentorAsk: false,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag) {
  return FEATURE_FLAGS[flag]
}
