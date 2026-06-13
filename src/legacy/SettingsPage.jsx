import React, { useEffect, useState } from 'react'

const BASE_SETTINGS_ITEMS = [
  { title: 'Gemini API status', detail: 'Configured from environment' },
  { title: 'Supabase status', detail: 'Tasks connected to Supabase' },
  { title: 'Integrations', detail: 'Calendar, email, and external workflow connections' },
  { title: 'Notifications', detail: 'Daily briefings, reminders, and escalation alerts' },
  { title: 'Preferences', detail: 'Tone, language, and app behavior' },
]

const WORKSPACE_TOOLS = [
  {
    id: 'calendar',
    icon: '📅',
    title: 'Calendar Intelligence',
    description: 'Manage meetings, deadlines and daily briefings.',
  },
  {
    id: 'cs-agent',
    icon: '🤖',
    title: 'CS Agent',
    description: 'Customer service assistant and follow-up helper.',
  },
  {
    id: 'chief',
    icon: '🧠',
    title: 'Chief AI',
    description: 'Strategic planning and executive recommendations.',
  },
]

const MEMORY_PROFILE_FIELDS = [
  {
    key: 'role',
    label: 'Role',
    fallback: 'Customer Service / Leadgen',
    type: 'profile',
  },
  {
    key: 'project',
    label: 'Project',
    fallback: 'ControlHub Nexus AI',
    type: 'project',
  },
  {
    key: 'goal',
    label: 'Goal',
    fallback: 'Build AI Branding and Reduce Repetitive Work',
    type: 'goal',
  },
  {
    key: 'brand_focus',
    label: 'Brand Focus',
    fallback: 'AI Automation',
    type: 'profile',
    aliases: ['focus_area'],
  },
]

function getMemoryByKey(memories = [], field) {
  const keys = [field.key, ...(field.aliases || [])].map((key) => key.toLowerCase())
  return memories.find((memory) => keys.includes(memory.key?.toLowerCase()))
}

export default function SettingsPage({
  tasksError,
  userProfile,
  memories = [],
  memoryLoading,
  memoryError,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  onOpenWorkspace,
}) {
  const [isMemoryEditorOpen, setIsMemoryEditorOpen] = useState(false)
  const [draftValues, setDraftValues] = useState({})
  const profileDetail = userProfile?.isFallback
    ? 'Lengkapi profil untuk pengalaman yang lebih personal.'
    : [userProfile?.name, userProfile?.role].filter(Boolean).join(', ') || 'Profile loaded'
  const settingsItems = [
    { title: 'Profile', detail: profileDetail },
    ...BASE_SETTINGS_ITEMS,
  ]

  useEffect(() => {
    setDraftValues((current) => {
      const nextValues = { ...current }

      MEMORY_PROFILE_FIELDS.forEach((field) => {
        const memory = getMemoryByKey(memories, field)
        nextValues[field.key] = current[field.key] ?? memory?.value ?? field.fallback
      })

      return nextValues
    })
  }, [memories])

  const handleMemoryProfileSave = async (event) => {
    event.preventDefault()

    for (const field of MEMORY_PROFILE_FIELDS) {
      const value = draftValues[field.key]?.trim()
      const memory = getMemoryByKey(memories, field)

      if (!value || value === memory?.value) continue
      if (memory) {
        await onUpdateMemory(memory.id, value)
        continue
      }

      await onAddMemory(field.key, value, field.type)
    }

    setIsMemoryEditorOpen(false)
  }

  const memoryProfile = Object.fromEntries(
    MEMORY_PROFILE_FIELDS.map((field) => {
      const memory = getMemoryByKey(memories, field)
      return [field.key, memory?.value || draftValues[field.key] || field.fallback]
    })
  )

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Configuration</span>
          <h2>Settings</h2>
        </div>
      </div>

      <div className="settings-list">
        {settingsItems.map((item) => (
          <div className="settings-card" key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.title === 'Supabase status' && tasksError ? tasksError : item.detail}</span>
          </div>
        ))}
      </div>

      <section className="settings-card workspace-tools-card">
        <div className="workspace-tools-head">
          <div>
            <strong>Workspace Tools</strong>
            <span>Advanced Nexus modules for calendar, service, and executive work.</span>
          </div>
        </div>

        <div className="workspace-tools-list">
          {WORKSPACE_TOOLS.map((tool) => (
            <button
              type="button"
              className="workspace-tool-card"
              key={tool.id}
              onClick={() => onOpenWorkspace?.(tool.id)}
            >
              <span className="workspace-tool-icon" aria-hidden="true">{tool.icon}</span>
              <span className="workspace-tool-copy">
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <span className="workspace-tool-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-card memory-engine-card">
        <div className="memory-profile-head">
          <div>
            <strong>🧠 Memory Profile</strong>
            <span>Nexus remembers your working context as an AI profile.</span>
          </div>
        </div>

        {memoryLoading && <div className="task-empty">Loading memory...</div>}
        {memoryError && <div className="task-empty">{memoryError}</div>}

        {!memoryLoading && !memoryError && (
          <div className="memory-profile-summary">
            {MEMORY_PROFILE_FIELDS.slice(0, 3).map((field) => (
              <div className="memory-profile-row" key={field.key}>
                <span>{field.label}:</span>
                <strong>{memoryProfile[field.key]}</strong>
              </div>
            ))}

            <button type="button" className="memory-edit-btn" onClick={() => setIsMemoryEditorOpen(true)}>
              Edit Memory
            </button>
          </div>
        )}
      </section>

      {isMemoryEditorOpen && (
        <div className="memory-sheet-backdrop" role="presentation" onClick={() => setIsMemoryEditorOpen(false)}>
          <section className="memory-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="memory-sheet-handle"></div>
            <div className="memory-sheet-head">
              <div>
                <span className="eyebrow">Memory Profile</span>
                <h3>Edit Memory</h3>
              </div>
              <button type="button" onClick={() => setIsMemoryEditorOpen(false)}>×</button>
            </div>

            <form className="memory-profile-form" onSubmit={handleMemoryProfileSave}>
              {MEMORY_PROFILE_FIELDS.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type="text"
                    value={draftValues[field.key] || ''}
                    onChange={(event) =>
                      setDraftValues((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}

              <div className="memory-sheet-actions">
                <button type="button" onClick={() => setIsMemoryEditorOpen(false)}>Cancel</button>
                <button type="submit">Save Memory</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
