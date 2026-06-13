export function buildNexusContext(tasks = []) {
  const currentTasks = tasks
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const pendingTasks = tasks.filter((task) => task.status === 'pending')
  const priorityTasks = tasks.filter((task) => task.priority === 'high')

  return {
    currentTasks,
    completedTasks,
    pendingTasks,
    priorityTasks,
  }
}
