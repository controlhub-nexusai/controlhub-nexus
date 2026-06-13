import React, { useMemo } from 'react'
import { calculatePriority } from '../../services/priorityEngine'
import TaskList from './TaskList'

const PRIORITY_RANK = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export default function TasksPage({
  tasks = [],
  loading = false,
  error = '',
  onRetry,
  onToggleTask,
  onDeleteTask,
  onOpenJarvis,
}) {
  const sortedTasks = useMemo(() => tasks
    .map((task) => ({
      ...task,
      calculatedPriority: calculatePriority(task),
    }))
    .sort((first, second) => {
      const priorityDelta = PRIORITY_RANK[second.calculatedPriority] - PRIORITY_RANK[first.calculatedPriority]
      if (priorityDelta !== 0) return priorityDelta

      return String(first.createdAt || '').localeCompare(String(second.createdAt || ''))
    }), [tasks])

  const activeTasks = sortedTasks.filter((task) => task.status !== 'completed')
  const completedTasks = sortedTasks.filter((task) => task.status === 'completed')

  return (
    <div className="task-page simple-page">
      <div className="focus-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Tasks</span>
            <h2>Task List</h2>
          </div>
          <button type="button" className="add-task-toggle" onClick={onOpenJarvis}>Ask Jarvis</button>
        </div>

        {loading && <div className="task-empty">Loading tasks...</div>}

        {error && (
          <div className="task-empty">
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="task-section">
              <h3>Active</h3>
              <TaskList tasks={activeTasks} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} />
            </div>

            {completedTasks.length > 0 && (
              <div className="task-section">
                <h3>Completed</h3>
                <TaskList tasks={completedTasks} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
