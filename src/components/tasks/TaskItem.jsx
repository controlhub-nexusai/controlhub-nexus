import React from 'react'
import { calculatePriority } from '../../services/priorityEngine'

const PRIORITY_BADGES = {
  HIGH: '🔴 HIGH',
  MEDIUM: '🟡 MEDIUM',
  LOW: '🟢 LOW',
}

function formatTaskMeta(task) {
  return [
    task.dueDate,
    task.dueTime,
    task.category,
  ].filter(Boolean).join(' • ')
}

export default function TaskItem({ task, onToggleTask, onDeleteTask }) {
  const priority = task.calculatedPriority || calculatePriority(task)

  return (
    <article className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
      <button
        type="button"
        className="task-checkbox"
        aria-label={`Toggle ${task.title}`}
        aria-pressed={task.status === 'completed'}
        onClick={() => onToggleTask?.(task.id, task.status)}
      >
        {task.status === 'completed' ? '✓' : ''}
      </button>
      <div className="task-copy">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span className={`priority-pill intelligence ${priority.toLowerCase()}`}>
            {PRIORITY_BADGES[priority]}
          </span>
          {formatTaskMeta(task) && <span>{formatTaskMeta(task)}</span>}
        </span>
      </div>
      {onDeleteTask && (
        <div className="task-actions">
          <button type="button" aria-label={`Delete ${task.title}`} onClick={() => onDeleteTask(task.id)}>×</button>
        </div>
      )}
    </article>
  )
}
