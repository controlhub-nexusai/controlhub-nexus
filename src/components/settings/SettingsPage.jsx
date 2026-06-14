import React, { useEffect, useState } from 'react'
import { summarizeMemoryGroups } from '../../services/jarvis/jarvisMemory'

const INTEGRATION_ITEMS = [
  { title: 'Gemini API', detail: 'Configured from environment' },
  { title: 'Local MVP data', detail: 'Nexus can use tasks, leads, content, and memory.' },
  { title: 'Future integrations', detail: 'Calendar, email, and voice remain placeholders.' },
]

const MEMORY_PROFILE_FIELDS = [
  { key: 'role', label: 'Role', fallback: 'Customer Service / Leadgen', type: 'profile' },
  { key: 'project', label: 'Project', fallback: 'ControlHub Nexus AI', type: 'project' },
  { key: 'goal', label: 'Goal', fallback: 'Build AI Branding and Reduce Repetitive Work', type: 'goal' },
  { key: 'brand_focus', label: 'Brand Focus', fallback: 'AI Automation', type: 'profile', aliases: ['focus_area'] },
]

function getMemoryByKey(memories = [], field) {
  const keys = [field.key, ...(field.aliases || [])].map((key) => key.toLowerCase())
  return memories.find((memory) => keys.includes(memory.key?.toLowerCase()))
}

export default function SettingsPage({
  userProfile,
  memories = [],
  memoryLoading,
  memoryError,
  onAddMemory,
  onUpdateMemory,
}) {
  const [isMemoryEditorOpen, setIsMemoryEditorOpen] = useState(false)
  const [draftValues, setDraftValues] = useState({})
  const profileDetail = userProfile?.isFallback
    ? 'Complete profile memory for a more personal Nexus.'
    : [userProfile?.name, userProfile?.role].filter(Boolean).join(', ') || 'Profile loaded'

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
  const memorySummary = summarizeMemoryGroups(memories)
  const rememberedThings = [
    ...memorySummary.lead,
    ...memorySummary.decision,
    ...memorySummary.note,
  ].slice(0, 4)

  return (
    <div className="page simple-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Settings</span>
          <h2>Profile & Memory</h2>
        </div>
      </div>

      <div className="settings-list">
        <div className="settings-card">
          <strong>Profile</strong>
          <span>{profileDetail}</span>
        </div>

        {INTEGRATION_ITEMS.map((item) => (
          <div className="settings-card" key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>

      <section className="settings-card memory-engine-card">
        <div className="memory-profile-head">
          <div>
            <strong>Memory Nexus</strong>
            <span>Ringkasan singkat yang Nexus pakai di belakang layar.</span>
          </div>
        </div>

        {memoryLoading && <div className="task-empty">Loading memory...</div>}
        {memoryError && <div className="task-empty">{memoryError}</div>}

        {!memoryLoading && !memoryError && (
          <div className="memory-profile-summary">
            <div className="memory-summary-block">
              <span>Tentang Saya</span>
              <strong>{memoryProfile.role}</strong>
            </div>

            <div className="memory-summary-block">
              <span>Preferensi Nexus</span>
              <strong>{memorySummary.preference[0] || 'Bahasa Indonesia, singkat, satu fokus.'}</strong>
            </div>

            <div className="memory-summary-block">
              <span>Proyek Aktif</span>
              <strong>{memoryProfile.project}</strong>
            </div>

            <div className="memory-summary-block">
              <span>Hal yang Nexus Ingat</span>
              <strong>{rememberedThings[0] || memoryProfile.goal}</strong>
            </div>

            <button type="button" className="memory-edit-btn" onClick={() => setIsMemoryEditorOpen(true)}>
              Edit Ringkasan
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
