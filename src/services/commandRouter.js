import { COMMAND_INTENTS, parseCommand } from './commandParser'

const ROUTE_TYPES = {
  [COMMAND_INTENTS.TASK_CREATE]: 'task',
  [COMMAND_INTENTS.LEAD_CREATE]: 'lead',
  [COMMAND_INTENTS.CONTENT_CREATE]: 'content',
  [COMMAND_INTENTS.TASK_SUMMARY]: 'task_summary',
  [COMMAND_INTENTS.PRIORITY_CHECK]: 'priority_check',
  [COMMAND_INTENTS.REMINDER_SUMMARY]: 'reminder_summary',
  [COMMAND_INTENTS.DAILY_PLAN]: 'daily_plan',
  [COMMAND_INTENTS.DAILY_REVIEW]: 'daily_review',
  [COMMAND_INTENTS.WEEKLY_REVIEW]: 'weekly_review',
  [COMMAND_INTENTS.FOCUS_MODE]: 'focus_mode',
  [COMMAND_INTENTS.CLARIFY]: 'chat',
  [COMMAND_INTENTS.CHAT]: 'chat',
}

const ROUTE_CONFIG = {
  [COMMAND_INTENTS.TASK_CREATE]: {
    module: 'tasks',
    action: 'create',
    responseType: 'task_created',
    service: 'taskService',
  },
  [COMMAND_INTENTS.LEAD_CREATE]: {
    module: 'leads',
    action: 'create',
    responseType: 'lead_created',
    service: 'leadService',
  },
  [COMMAND_INTENTS.CONTENT_CREATE]: {
    module: 'content',
    action: 'create',
    responseType: 'content_created',
    service: 'contentService',
  },
  [COMMAND_INTENTS.TASK_SUMMARY]: {
    module: 'tasks',
    action: 'summary',
    responseType: 'task_summary',
    service: 'taskSummary',
  },
  [COMMAND_INTENTS.PRIORITY_CHECK]: {
    module: 'nexus',
    action: 'priorities',
    responseType: 'priority_briefing',
    service: 'priorityCoach',
  },
  [COMMAND_INTENTS.REMINDER_SUMMARY]: {
    module: 'tasks',
    action: 'reminders',
    responseType: 'reminder_summary',
    service: 'taskSummary',
  },
  [COMMAND_INTENTS.DAILY_PLAN]: {
    module: 'nexus',
    action: 'generate_daily_plan',
    responseType: 'daily_plan',
    service: 'dailyPlanning',
  },
  [COMMAND_INTENTS.DAILY_REVIEW]: {
    module: 'nexus',
    action: 'generate_daily_review',
    responseType: 'daily_review',
    service: 'dailyReview',
  },
  [COMMAND_INTENTS.WEEKLY_REVIEW]: {
    module: 'nexus',
    action: 'generate_weekly_review',
    responseType: 'weekly_review',
    service: 'weeklyReview',
  },
  [COMMAND_INTENTS.FOCUS_MODE]: {
    module: 'nexus',
    action: 'start_focus_mode',
    responseType: 'focus_mode',
    service: 'focusMode',
  },
  [COMMAND_INTENTS.CLARIFY]: {
    module: 'nexus',
    action: 'clarify',
    responseType: 'clarification',
    service: 'chat',
  },
  [COMMAND_INTENTS.CHAT]: {
    module: 'nexus',
    action: 'chat',
    responseType: 'chat',
    service: 'chat',
  },
}

export function routeCommand(message, context = {}) {
  const parsed = parseCommand(message, context)
  const config = ROUTE_CONFIG[parsed.intent] || ROUTE_CONFIG[COMMAND_INTENTS.CHAT]

  return {
    intent: parsed.intent,
    module: config.module,
    action: config.action,
    payload: parsed.payload || {},
    responseType: config.responseType,
    originalText: parsed.originalText,
    type: ROUTE_TYPES[parsed.intent] || 'chat',
    service: config.service,
  }
}

export { COMMAND_INTENTS, parseCommand }
