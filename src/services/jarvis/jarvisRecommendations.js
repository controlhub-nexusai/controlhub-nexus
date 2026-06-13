import { generateFocusTask } from '../focusService'

export function recommendOneAction({ tasks = [], leads = [], content = [], reminders = [] } = {}) {
  return generateFocusTask({ tasks, leads, content, reminders })
}
