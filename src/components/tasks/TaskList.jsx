import React from 'react'
import TaskItem from './TaskItem'

export default function TaskList({ tasks, onToggleTask, onDeleteTask }) {
  if (tasks.length === 0) {
    return <div className="task-empty">No tasks yet. Ask Jarvis what to focus on first.</div>
  }

  return (
    <div className="task-list">
      {tasks.map((task, index) => (
        <TaskItem
          key={task.id || `${task.title || 'task'}-${index}`}
          task={task}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  )
}
