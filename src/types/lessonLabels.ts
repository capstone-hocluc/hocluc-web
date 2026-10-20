/** Authoring labels from lessonlabel/dto; codes are from the subject's active label set. */
export interface LessonMicroSkillOption {
  code: string
  nameVi: string
  suggestedDrill: string | null
}

export interface LessonSkillLabel {
  code: string
  primary: boolean
  nameVi: string | null
  domainCodes: string[]
  prerequisiteSkillCode: string | null
  microSkills: LessonMicroSkillOption[]
  inActiveSet: boolean
}

export interface LessonVideoMicroSkill {
  code: string
  nameVi: string | null
  skillCode: string | null
  inActiveSet: boolean
}

export interface LessonVideoLabels {
  videoId: string
  title: string
  durationSeconds: number | null
  sequence: number
  microSkills: LessonVideoMicroSkill[]
}

export interface LessonMarkerResponse {
  id: string
  /** Legacy markers on lesson.videoUrl may have no video ID or title. New writes require one. */
  videoId: string | null
  videoTitle: string | null
  second: number
  time: string
  title: string
  microSkillCode: string
}

export interface LessonLabelsResponse {
  lessonId: string
  lessonTitle: string
  chapterId: string
  chapterTitle: string
  subjectCategoryId: string | null
  subjectName: string | null
  labelSetVersion: string | null
  chapterDomainCodes: string[]
  skills: LessonSkillLabel[]
  videos: LessonVideoLabels[]
  markers: LessonMarkerResponse[]
  /** Derived from videos and markers, never sent as lesson-level selections. */
  microSkillCodes: string[]
  domainCodes: string[]
  patternCodes: string[]
  prerequisiteSkillCodes: string[]
}

export interface LessonLabelsRequest {
  /** Replaces all skills (max 50). Empty clears; non-empty needs exactly one primary.
   * The backend automatically makes a single skill primary. */
  skills: { code: string; primary: boolean }[]
}

export interface LessonVideoLabelsRequest {
  /** Replaces one video's micro-skills (max 50), each belonging to a lesson skill. Empty clears. */
  microSkills: string[]
}

export interface LessonMarkerRequest {
  videoId: string
  /** Non-negative integer within the video's duration, when known. */
  second: number
  /** Non-blank, max 255 characters. */
  title: string
  microSkillCode: string
}

export interface LessonMarkersRequest {
  /** Replaces every marker of the lesson (max 200). Empty clears. */
  markers: LessonMarkerRequest[]
}

export interface LessonSuggestionResponse {
  lessonId: string
  lessonTitle: string
  chapterId: string
  chapterTitle: string
  courseId: string
  courseTitle: string
  matchedBy: 'MARKER' | 'VIDEO' | 'SKILL'
  primary: boolean
  /** Null for a SKILL match; legacy MARKER matches can also have no video ID. */
  videoId: string | null
  videoTitle: string | null
  /** Marker offset, 0 for VIDEO, null for SKILL. */
  second: number | null
  marker: LessonMarkerResponse | null
}

/** Exactly one non-blank code. */
export type FindLessonsByLabelQuery =
  | { skillCode: string; microSkillCode?: never }
  | { microSkillCode: string; skillCode?: never }

/** At least one non-blank code; both are allowed for fallback to the question's skill. */
export type LessonSuggestionsQuery =
  | { microSkillCode: string; skillCode?: string }
  | { skillCode: string; microSkillCode?: string }
