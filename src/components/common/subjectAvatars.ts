export const SUBJECT_AVATAR_TYPES = ['mech', 'flower', 'alien', 'hexagon', 'drop', 'star', 'cloud'] as const
export type SubjectAvatarType = (typeof SUBJECT_AVATAR_TYPES)[number]
