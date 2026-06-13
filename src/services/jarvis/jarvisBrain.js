import { generateNexusResponse } from '../geminiService'
import { resolveJarvisAction } from './jarvisActions'
import { recommendOneAction } from './jarvisRecommendations'

export function thinkWithLocalContext(message, context = {}) {
  const action = resolveJarvisAction(message, context)
  const recommendation = recommendOneAction(context)

  return {
    action,
    recommendation,
  }
}

export async function generateJarvisResponse(message, tasks, memories, profile) {
  return generateNexusResponse(message, tasks, memories, profile)
}
