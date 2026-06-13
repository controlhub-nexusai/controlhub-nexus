import React, { useMemo, useState } from 'react'
import { buildPriorityCoach, buildTaskCompletionMessage, getGoalSupport } from '../services/nexusAssistant'
import { calculatePriority } from '../services/priorityEngine'
import { generateDailyReview } from '../services/dailyReviewService'
import { generateWeeklyReview } from '../services/weeklyReviewService'

const PRIORITY_RANK = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

const PRIORITY_ESTIMATES = {
  HIGH: 60,
  MEDIUM: 45,
  LOW: 30,
}

const PRIORITY_BADGES = {
  HIGH: '🔴 HIGH',
  MEDIUM: '🟡 MEDIUM',
  LOW: '🟢 LOW',
}

const TIME_BLOCKS = [
  { key: 'morning', label: 'Morning', time: '09:00 - 11:00' },
  { key: 'afternoon', label: 'Afternoon', time: '13:00 - 15:00' },
  { key: 'evening', label: 'Evening', time: '16:00 - 17:00' },
]

function getPriorityRank(priority) {
  return PRIORITY_RANK[String(priority || '').toUpperCase()] || 0
}

function getTaskEstimate(task) {
  return PRIORITY_ESTIMATES[String(task.calculatedPriority || task.priority || '').toUpperCase()] || 30
}

function formatWorkTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

function isHotLead(lead = {}) {
  const status = String(lead.status || '').toLowerCase()
  return ['new', 'interested', 'proposal', 'follow up', 'follow_up', 'contacted'].includes(status)
}

function getContentTitle(item = {}) {
  return item.title || item.text || item.platform || 'Create content idea'
}

function buildRecommendation({ activeTasks = [], leads = [], contentIdeas = [], generatedContent = [] }) {
  const hotLeads = leads.filter(isHotLead)
  if (hotLeads.length > 0) {
    return {
      action: 'Follow up hot leads',
      reason: 'Highest business impact.',
    }
  }

  const highPriorityTask = activeTasks.find((task) => getPriorityRank(task.calculatedPriority || task.priority) === PRIORITY_RANK.HIGH)
  if (highPriorityTask) {
    return {
      action: highPriorityTask.title,
      reason: 'Highest priority active task.',
    }
  }

  const contentDraft = generatedContent.find((item) => {
    const status = String(item.status || '').toLowerCase()
    return ['draft', 'drafted', 'waiting_review', 'review'].includes(status)
  })
  if (contentDraft) {
    return {
      action: `Review content: ${getContentTitle(contentDraft)}`,
      reason: 'Content is already close to completion.',
    }
  }

  const contentIdea = contentIdeas[0]
  if (contentIdea) {
    return {
      action: `Turn idea into content: ${getContentTitle(contentIdea)}`,
      reason: 'Keeps your content pipeline moving.',
    }
  }

  return {
    action: 'Plan today’s work',
    reason: 'Start by creating one clear task.',
  }
}

function buildDailyPlan({ activeTasks = [], leads = [], contentIdeas = [], generatedContent = [] } = {}) {
  const sortedTasks = [...activeTasks].sort((firstTask, secondTask) => {
    const priorityDelta = getPriorityRank(secondTask.calculatedPriority || secondTask.priority) - getPriorityRank(firstTask.calculatedPriority || firstTask.priority)
    if (priorityDelta !== 0) return priorityDelta

    return String(firstTask.createdAt || '').localeCompare(String(secondTask.createdAt || ''))
  })
  const topPriorities = sortedTasks.slice(0, 3)
  const totalMinutes = topPriorities.reduce((total, task) => total + getTaskEstimate(task), 0)

  return {
    topPriorities,
    estimatedMinutes: totalMinutes,
    recommendation: buildRecommendation({ activeTasks: sortedTasks, leads, contentIdeas, generatedContent }),
    timeBlocks: TIME_BLOCKS.map((block, index) => ({
      ...block,
      task: topPriorities[index] || null,
    })),
  }
}

function labelize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatCreatedDate(createdAt) {
  if (!createdAt) return ''

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(createdAt))
}

function formatTaskSchedule(task) {
  if (!task.dueDate && !task.dueTime) return ''

  const dateLabel = task.dueDate
    ? new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(`${task.dueDate}T00:00:00`))
    : ''
  const timeLabel = task.dueTime ? `${task.dueTime} WIB` : ''

  return [dateLabel, timeLabel].filter(Boolean).join(' • ')
}

export default function TaskManager({
  tasks,
  leads = [],
  contentIdeas = [],
  generatedContent = [],
  memories = [],
  onDeleteTask,
  onToggleTask,
  loading,
  error,
  onRetry,
  onOpenNexus,
  userProfile,
}) {
  const [completionNote, setCompletionNote] = useState('')
  const [planRefreshCount, setPlanRefreshCount] = useState(0)
  const completedCount = tasks.filter((task) => task.status === 'completed').length
  const tasksWithPriority = useMemo(() => tasks.map((task) => ({
    ...task,
    calculatedPriority: calculatePriority(task),
  })), [tasks])
  const activePlanTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed'), [tasks])
  const pendingTasks = useMemo(() => tasksWithPriority
    .filter((task) => task.status !== 'completed')
    .sort((firstTask, secondTask) => {
      const priorityDelta = getPriorityRank(secondTask.calculatedPriority) - getPriorityRank(firstTask.calculatedPriority)
      if (priorityDelta !== 0) return priorityDelta

      return String(firstTask.createdAt || '').localeCompare(String(secondTask.createdAt || ''))
    }), [tasksWithPriority])
  const completedTasks = useMemo(() => tasksWithPriority.filter((task) => task.status === 'completed'), [tasksWithPriority])
  const prioritySummary = useMemo(() => pendingTasks.reduce((summary, task) => ({
    ...summary,
    [task.calculatedPriority]: summary[task.calculatedPriority] + 1,
  }), { HIGH: 0, MEDIUM: 0, LOW: 0 }), [pendingTasks])
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const priorityCoach = buildPriorityCoach(tasks)
  const priorityInsight = prioritySummary.HIGH > 0
    ? `Nexus detected ${prioritySummary.HIGH} high-priority ${prioritySummary.HIGH === 1 ? 'task' : 'tasks'}. Complete these before working on content.`
    : 'Nexus found no high-priority tasks. Keep momentum with your next medium-priority task.'
  const nexusNote = completionNote || priorityCoach.text
  const generatedPlan = useMemo(() => buildDailyPlan({
    activeTasks: activePlanTasks,
    leads,
    contentIdeas,
    generatedContent,
  }), [activePlanTasks, contentIdeas, generatedContent, leads, planRefreshCount])
  const dailyReview = useMemo(() => generateDailyReview({
    tasks,
    leads,
    content: generatedContent,
    reminders: [],
  }), [generatedContent, leads, tasks])
  const weeklyReview = useMemo(() => generateWeeklyReview({
    tasks,
    leads,
    content: generatedContent,
    reminders: [],
  }), [generatedContent, leads, tasks])
  const planHasTasks = generatedPlan.topPriorities.length > 0

  const handleToggleTask = async (task) => {
    await onToggleTask(task.id, task.status)

    if (task.status !== 'completed') {
      setCompletionNote(buildTaskCompletionMessage(task, tasks, memories, userProfile))
    } else {
      setCompletionNote('')
    }
  }

  const handleGenerateDailyPlan = () => {
    setPlanRefreshCount((count) => count + 1)
  }

  const renderTask = (task) => (
    <div key={task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
      <button
        type="button"
        className="task-checkbox"
        aria-label={`Toggle ${task.title}`}
        aria-pressed={task.status === 'completed'}
        onClick={() => handleToggleTask(task)}
      >
        {task.status === 'completed' ? '✓' : ''}
      </button>
      <div className="task-copy">
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span className={`priority-pill intelligence ${task.calculatedPriority.toLowerCase()}`}>
            {PRIORITY_BADGES[task.calculatedPriority]}
          </span>
          {formatTaskSchedule(task) && <span>{formatTaskSchedule(task)}</span>}
          {task.createdAt && <span>{formatCreatedDate(task.createdAt)}</span>}
          <span className={`task-badge ${task.category}`}>{labelize(task.category)}</span>
          {getGoalSupport(task, memories) && <span className="goal-support-badge">Supports Goal</span>}
          {task.reminderMinutes && <span>Reminder {task.reminderMinutes} min</span>}
        </span>
      </div>
      <div className="task-actions">
        <button type="button" aria-label={`Delete ${task.title}`} onClick={() => onDeleteTask(task.id)}>×</button>
      </div>
    </div>
  )

  return (
    <div className="task-page">
      <div className="focus-card">
        <div className="section-heading">
          <div>
            <h2>TASK CENTER</h2>
          </div>
          {tasks.length > 0 && <span className="task-count">{completedCount}/{tasks.length}</span>}
        </div>

        {tasks.length > 0 && (
          <div className="task-progress-line">
            <span>{completedCount} / {tasks.length} selesai</span>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }}></span>
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="priority-intelligence-card">
            <div className="priority-summary-grid" aria-label="Priority Summary">
              <div>
                <span>HIGH</span>
                <strong>{prioritySummary.HIGH}</strong>
              </div>
              <div>
                <span>MEDIUM</span>
                <strong>{prioritySummary.MEDIUM}</strong>
              </div>
              <div>
                <span>LOW</span>
                <strong>{prioritySummary.LOW}</strong>
              </div>
            </div>
            <div className="priority-insight">
              <span>Nexus Insight</span>
              <p>{priorityInsight}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="task-plan-card">
            <div className="task-plan-header">
              <div>
                <span className="eyebrow">TODAY'S PLAN</span>
                <p>{planHasTasks ? 'Generated from active tasks.' : 'No active tasks.'}</p>
              </div>
              {tasks.length > 0 && (
                <button type="button" onClick={handleGenerateDailyPlan}>
                  Refresh Plan
                </button>
              )}
            </div>

            {!planHasTasks ? (
              <div className="task-plan-empty">
                <strong>No active tasks.</strong>
                <span>Suggestions</span>
                <div className="task-plan-suggestions">
                  <button type="button" onClick={onOpenNexus}>Create your first task</button>
                  <button type="button" onClick={onOpenNexus}>Create content idea</button>
                  <button type="button" onClick={onOpenNexus}>Plan today's work</button>
                </div>
              </div>
            ) : (
              <>
                <div className="task-plan-summary">
                  <div>
                    <span>Estimated Work Time</span>
                    <strong>{formatWorkTime(generatedPlan.estimatedMinutes)}</strong>
                  </div>
                  <div>
                    <span>Most Important Task</span>
                    <strong>{generatedPlan.topPriorities[0]?.title || 'None yet'}</strong>
                  </div>
                </div>

                <details className="task-plan-section" open>
                  <summary>Today's Top 3 Priorities</summary>
                  <ol className="task-plan-priority-list">
                    {generatedPlan.topPriorities.map((task, index) => (
                      <li key={task.id}>
                        <span>#{index + 1}</span>
                        <strong>{task.title}</strong>
                      </li>
                    ))}
                  </ol>
                </details>

                <details className="task-plan-section">
                  <summary>Time Blocks</summary>
                  <div className="task-plan-timeblocks">
                    {generatedPlan.timeBlocks.map((block) => (
                      <div key={block.key}>
                        <span>{block.label}</span>
                        <small>{block.time}</small>
                        <strong>{block.task?.title || 'Open slot'}</strong>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="task-plan-section">
                  <summary>Nexus Recommendation</summary>
                  <div className="task-plan-recommendation">
                    <span>Start with:</span>
                    <strong>{generatedPlan.recommendation.action}</strong>
                    <span>Reason:</span>
                    <p>{generatedPlan.recommendation.reason}</p>
                  </div>
                </details>
              </>
            )}
          </div>
        )}

        {tasks.length > 0 && (
          <section className="task-review-stack" aria-label="Task reviews">
            <details className="task-plan-section">
              <summary>Daily Review</summary>
              <div className="task-review-grid">
                <div><span>Completed</span><strong>{dailyReview.completedCount}</strong></div>
                <div><span>Pending</span><strong>{dailyReview.pendingCount}</strong></div>
                <div><span>Lead Follow Up</span><strong>{dailyReview.leadFollowUps}</strong></div>
                <div><span>Draft Content</span><strong>{dailyReview.draftContent}</strong></div>
              </div>
              <p className="task-review-note">{dailyReview.tomorrowRecommendation}</p>
            </details>

            <details className="task-plan-section">
              <summary>Weekly Review</summary>
              <div className="task-review-grid">
                <div><span>Momentum</span><strong>{weeklyReview.momentumScore}%</strong></div>
                <div><span>Completed</span><strong>{weeklyReview.completedTasks}</strong></div>
                <div><span>Leads</span><strong>{weeklyReview.leadsFollowedUp}</strong></div>
                <div><span>Content</span><strong>{weeklyReview.contentCreated}</strong></div>
              </div>
              <p className="task-review-note">{weeklyReview.nextWeekRecommendation}</p>
            </details>
          </section>
        )}

        {loading && <div className="task-empty">Loading tasks...</div>}

        {error && (
          <div className="task-empty">
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="task-section">
            <h3>Pending tasks</h3>
            <div className="task-list">
              {!loading && !error && pendingTasks.length === 0 ? (
                <div className="task-empty">Bagus. Tidak ada tugas pending.</div>
              ) : !loading && !error && (
                pendingTasks.map(renderTask)
              )}
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="task-section">
            <h3>Completed tasks</h3>
            <div className="task-list">
              {!loading && !error && completedTasks.length === 0 ? (
                <div className="task-empty">Belum ada tugas selesai.</div>
              ) : !loading && !error && (
                completedTasks.map(renderTask)
              )}
            </div>
          </div>
        )}
      </div>

      <div className="task-hint">
        <span className="eyebrow">Nexus note</span>
        <p>{nexusNote}</p>
      </div>
    </div>
  )
}
