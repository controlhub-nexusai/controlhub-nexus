import React, { useMemo } from 'react'
import {
  formatReminderDateLabel,
  formatReminderTime,
  getOverdueTasks,
  getUpcomingTasks,
} from '../utils/reminderEngine'

function getJakartaNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
}

function getDaysSince(dateValue) {
  if (!dateValue) return Infinity

  const date = new Date(`${dateValue}T00:00:00+07:00`)
  if (Number.isNaN(date.getTime())) return Infinity

  return Math.floor((getJakartaNow().getTime() - date.getTime()) / 86400000)
}

function buildLeadFollowUpAlerts(leads = []) {
  return leads
    .filter((lead) => !['won', 'lost'].includes(lead.status))
    .filter((lead) => getDaysSince(lead.lastContact || lead.createdAt?.slice(0, 10)) > 3)
    .slice(0, 3)
    .map((lead) => ({
      id: `lead-${lead.id}`,
      title: `Follow up ${lead.name}`,
      type: 'Lead follow-up',
      message: `Hubungi ${lead.name} hari ini.`,
      time: lead.lastContact ? `Last contact ${lead.lastContact}` : 'Belum pernah dihubungi',
      status: lead.status || 'new',
      icon: '📞',
    }))
}

function buildTaskAlerts(tasks = []) {
  const upcomingAlerts = getUpcomingTasks(tasks, { limit: 3, windowHours: 24 }).map((task) => ({
    id: `upcoming-${task.id}`,
    title: task.title,
    type: 'Upcoming task',
    message: `${task.title} jam ${formatReminderTime(task.dueTime)}`,
    time: `${formatReminderDateLabel(task.dueDate)} ${formatReminderTime(task.dueTime)}`,
    status: 'upcoming',
    icon: '🔔',
  }))

  const overdueAlerts = getOverdueTasks(tasks, { limit: 3 }).map((task) => ({
    id: `overdue-${task.id}`,
    title: task.title,
    type: 'Overdue task',
    message: `${task.title} terlewat`,
    time: `${formatReminderDateLabel(task.dueDate)} ${formatReminderTime(task.dueTime)}`,
    status: 'overdue',
    icon: '⚠️',
  }))

  return [...overdueAlerts, ...upcomingAlerts]
}

function buildContentAlerts(generatedContent = []) {
  const drafts = generatedContent.filter((item) => item.status === 'draft')
  if (drafts.length === 0) return []

  return [{
    id: 'content-drafts',
    title: `${drafts.length} konten menunggu review`,
    type: 'Content draft waiting review',
    message: `${drafts.length} konten menunggu review`,
    time: 'Approval Queue',
    status: 'draft',
    icon: '📝',
  }]
}

export default function NotificationCenter({
  tasks = [],
  leads = [],
  generatedContent = [],
}) {
  const alerts = useMemo(() => [
    ...buildTaskAlerts(tasks),
    ...buildLeadFollowUpAlerts(leads),
    ...buildContentAlerts(generatedContent),
  ].slice(0, 6), [tasks, leads, generatedContent])

  return (
    <section className="notification-center">
      <div className="notification-center-head">
        <span>NEXUS ALERTS</span>
      </div>

      {alerts.length === 0 ? (
        <p className="notification-empty">Tidak ada alert penting saat ini.</p>
      ) : (
        <div className="notification-list">
          {alerts.map((alert) => (
            <article className={`notification-card ${alert.status}`} key={alert.id}>
              <div className="notification-icon">{alert.icon}</div>
              <div className="notification-body">
                <div className="notification-title-row">
                  <strong>{alert.title}</strong>
                  <span>{alert.status}</span>
                </div>
                <p>{alert.message}</p>
                <small>{alert.type} • {alert.time}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
