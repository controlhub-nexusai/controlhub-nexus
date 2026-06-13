import { buildMorningBriefing } from './nexusAssistant'

export function generateDailyBriefing(tasks = [], memories = [], profile) {
  return buildMorningBriefing(tasks, memories, profile)
}
