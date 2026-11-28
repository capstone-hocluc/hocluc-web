import type { AiProvider } from '../../../services/aiSettingsService'
import claude from '../../../assets/ai-providers/claude.svg'
import openai from '../../../assets/ai-providers/openai.svg'
import gemini from '../../../assets/ai-providers/gemini.svg'
import bedrock from '../../../assets/ai-providers/bedrock.svg'
import cloudflare from '../../../assets/ai-providers/cloudflare.svg'
import compatible from '../../../assets/ai-providers/compatible.svg'

export const providers: { id: AiProvider; label: string; logo: string }[] = [
  { id: 'anthropic', label: 'Anthropic · Claude', logo: claude },
  { id: 'openai', label: 'OpenAI', logo: openai },
  { id: 'gemini', label: 'Google Gemini', logo: gemini },
  { id: 'bedrock', label: 'Amazon Bedrock', logo: bedrock },
  { id: 'cloudflare', label: 'Cloudflare Workers AI', logo: cloudflare },
  { id: 'compatible', label: 'OpenAI-compatible khác', logo: compatible },
]
