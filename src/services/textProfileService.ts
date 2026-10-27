import { request } from '../lib/api'

// Mirrors fu.hocluc.textprofile.dto.TextProfileResponse. Shares are fractions (0-1);
// nullable numbers are null when the text is too short for that index.

export type DiversityUnit = 'FORM' | 'LEMMA'
export type CefrLabel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'OFF'
export type ZipfBand = 'VERY_COMMON' | 'COMMON' | 'MID_FREQUENCY' | 'RARE' | 'UNKNOWN'

export interface TextProfileScores {
  fleschReadingEase: number
  fleschBand: string
  fleschKincaidGrade: number
  gunningFog: number
  smog: number
  colemanLiau: number
  automatedReadability: number
  gradeMedian: number
  gradeMin: number
  gradeMax: number
}

export interface TextProfileWord {
  text: string
  lemma: string
  /** null when the word is not counted (number, name, abbreviation). */
  cefr: CefrLabel | null
  zipf: number | null
  zipfBand: ZipfBand
  syllables: number
  properNoun: boolean
  vocabulary: boolean
}

export interface TextProfile {
  counts: {
    words: number
    sentences: number
    paragraphs: number
    headings: number
    vocabularyTokens: number
    types: number
    lemmas: number
    wordsPerSentence: number
    charactersPerWord: number
  }
  readability: {
    words: number
    sentences: number
    syllables: number
    characters: number
    polysyllables: number
    complexWords: number
    scores: TextProfileScores | null
    smogLowReliability: boolean
  }
  vocabulary: {
    levels: {
      level: CefrLabel
      tokens: number
      tokenShare: number
      types: number
      typeShare: number
      cumulative: number | null
    }[]
    /** Upper bound: off-list words counted as unknown. ">C2" if never reached; null if the text is too short. */
    level95: string | null
    level98: string | null
    /** Lower bound: off-list words ignored. */
    lowerLevel95: string | null
    lowerLevel98: string | null
    offListShare: number
  }
  frequency: {
    bands: { band: ZipfBand; count: number; share: number }[]
    meanContentZipf: number | null
    topWords: { lemma: string; count: number; share: number; cefr: CefrLabel; zipf: number | null }[]
  }
  diversity: {
    unit: DiversityUnit
    tokens: number
    ttr: number | null
    rootTtr: number | null
    mattr: number | null
    mtld: number | null
    hdd: number | null
    lexicalDensity: number | null
  }
  words: TextProfileWord[]
  /** Plain-text pieces and word indexes (into `words`), one list per paragraph. */
  paragraphs: { text?: string | null; word?: number | null }[][]
  warnings: ('SHORT_TEXT' | 'LONG_SENTENCE')[]
  lexiconVersion: string
}

export async function analyzeText(text: string, diversityUnit: DiversityUnit): Promise<TextProfile> {
  const response = await request<TextProfile>('/api/v1/text-profiles', {
    method: 'POST',
    auth: true,
    body: { text, diversityUnit },
  })
  if (!response.data) throw new Error('Không phân tích được văn bản.')
  return response.data
}
