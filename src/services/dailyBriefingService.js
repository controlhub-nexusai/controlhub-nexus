import { getTodayTasks, getUpcomingTasks } from '../utils/reminderEngine'
import { buildMorningBriefing, buildPriorityCoach, getActiveTasks } from './nexusAssistant'
import { buildUserContext } from './personalizationService'

function formatScheduleItem(task) {
  return `${task.dueTime || '--:--'} - ${task.title}`
}

function capitalizeSentence(value) {
  if (!value) return value

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function asSentence(text = '') {
  return text.endsWith('.') ? text : `${text}.`
}

export function generateDailyBriefing(tasks = [], memories = [], profile) {
  const userContext = buildUserContext(profile)
  const goal = capitalizeSentence(profile?.primary_goal || '-')

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const pendingTasks = getActiveTasks(tasks)
  const highPriorityTasks = pendingTasks.filter((task) => task.priority === 'high')
  const reminders = pendingTasks.filter((task) => task.dueTime)
  const priorityCoach = buildPriorityCoach(tasks)
  const priorities = priorityCoach.priorities.map((task) => task.title)
  const todaySchedule = getTodayTasks(tasks, { includeCompleted: false }).filter((task) => task.dueTime)
  const dueTodayTasks = getTodayTasks(tasks)
  const nearestUpcoming = getUpcomingTasks(tasks, { limit: 1, windowHours: 24 })[0]
  const minutesUntilNearest = nearestUpcoming
    ? Math.ceil((nearestUpcoming.dueAt.getTime() - Date.now()) / 60000)
    : null
  const warning = nearestUpcoming && minutesUntilNearest <= 60
    ? `${nearestUpcoming.title} dimulai dalam ${minutesUntilNearest} menit.`
    : ''

  return {
    greeting: asSentence(userContext.greeting),
    role: userContext.role || '-',
    project: userContext.project || '-',
    goal,
    platformFocus: userContext.focus || '-',
    summary: [
      `- ${pendingTasks.length} tugas aktif`,
      `- ${highPriorityTasks.length} prioritas tinggi`,
      `- ${reminders.length} reminder`,
      `- ${completedTasks.length} dari ${totalTasks} tugas selesai`,
      `- ${dueTodayTasks.length} jatuh tempo hari ini`,
    ].join('\n'),
    priorities,
    todaySchedule: todaySchedule.map(formatScheduleItem),
    nearestUpcomingTask: nearestUpcoming
      ? formatScheduleItem(nearestUpcoming)
      : '',
    warning,
    morningBriefing: buildMorningBriefing(tasks, memories, profile),
    priorityCoach: priorityCoach.text,
    recommendation: totalTasks === 0
      ? 'Apa yang ingin kamu capai hari ini?'
      : pendingTasks.length === 0
      ? 'Semua tugas aktif sudah selesai. Lanjutkan review atau rencana berikutnya.'
      : userContext.recommendation,
  }
}
