import { buildNexusContext } from '../services/contextBuilder'

export function generateTaskSummary(tasks) {
  const {
    currentTasks,
    completedTasks,
    pendingTasks,
  } = buildNexusContext(tasks)
  const total = currentTasks.length
  const completed = completedTasks.length
  const pending = pendingTasks.length
  const pendingCategories = [...new Set(
    pendingTasks.map((task) => task.category)
  )]

  const focusLabels = pendingCategories.length > 0
    ? pendingCategories.slice(0, 2).map((category) => {
      if (category === 'work') return 'Follow up leads'
      if (category === 'content') return 'Create content'
      if (category === 'youtube') return 'Brainstorm YouTube idea'
      return 'Handle personal tasks'
    })
    : ['Review completed work']

  return `You have ${total} tasks today.
${completed} tasks completed.
${pending} tasks pending.

Suggested focus:

${focusLabels.map((label) => `* ${label}`).join('\n')}`
}
