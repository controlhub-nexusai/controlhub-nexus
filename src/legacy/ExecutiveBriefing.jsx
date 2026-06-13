import React from 'react'

export default function ExecutiveBriefing({ briefing }) {
  if (!briefing) return null

  return (
    <section className="executive-briefing-card">
      <details open>
        <summary>
          <span className="eyebrow">Executive Briefing</span>
          <strong>{briefing.nextBestAction}</strong>
        </summary>

        <div className="executive-briefing-body">
          <div className="executive-today-grid" aria-label="Executive Briefing Today">
            <div>
              <span>Tasks</span>
              <strong>{briefing.summary.activeTasks}</strong>
            </div>
            <div>
              <span>High Priority</span>
              <strong>{briefing.summary.highPriorityTasks}</strong>
            </div>
            <div>
              <span>Leads</span>
              <strong>{briefing.summary.pendingLeads}</strong>
            </div>
            <div>
              <span>Content Drafts</span>
              <strong>{briefing.summary.draftContent}</strong>
            </div>
          </div>

          <div className="executive-briefing-copy">
            <span>Opportunity</span>
            <p>{briefing.biggestOpportunity}</p>
            <span>Risk</span>
            <p>{briefing.biggestRisk}</p>
            <span>Next Best Action</span>
            <p>{briefing.nextBestAction}</p>
          </div>
        </div>
      </details>
    </section>
  )
}
