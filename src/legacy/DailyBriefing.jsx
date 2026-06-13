import React from 'react'
import { buildMorningBriefing, buildNexusScore, buildPriorityCoach } from '../services/nexusAssistant'

function NexusScoreCard({ score }) {
  return (
    <div className="nexus-score">
      <div className="nexus-score-head">
        <span>NEXUS SCORE</span>
        <strong>{score.percentage}%</strong>
      </div>
      <div className="nexus-score-bar" aria-label={`Nexus score ${score.percentage}%`}>
        <span style={{ width: `${score.percentage}%` }}></span>
      </div>
      <div className="nexus-score-meta">
        <span>{score.completed}/{score.total} task selesai</span>
        <span>{score.message}</span>
      </div>
    </div>
  )
}

export default function DailyBriefing({ tasks, memories = [], userProfile, loading, error }) {
  const briefing = buildMorningBriefing(tasks, memories, userProfile)
  const priorityCoach = buildPriorityCoach(tasks)
  const nexusScore = buildNexusScore(tasks)

  return (
    <section className="daily-briefing-card">
      <span className="eyebrow">Daily Briefing</span>
      <h2>Nexus AI</h2>

      {loading && <p>Sedang menyiapkan briefing hari ini...</p>}

      {!loading && error && <p>Briefing akan muncul setelah tasks berhasil dimuat.</p>}

      {!loading && !error && (
        <>
          <NexusScoreCard score={nexusScore} />
          <p>{briefing}</p>

          <div className="briefing-focus">
            <strong>Nexus Note:</strong>
            <p>{priorityCoach.text}</p>
          </div>
        </>
      )}
    </section>
  )
}
