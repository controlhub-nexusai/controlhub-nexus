import React, { useState } from 'react'
import { ideaPool } from '../mockData'

export default function ContentPanel({ ideas, setIdeas }) {
  const [loading, setLoading] = useState(false)

  const generateIdeas = () => {
    setLoading(true)
    setTimeout(() => {
      const shuffled = [...ideaPool].sort(() => 0.5 - Math.random())
      const picked = shuffled.slice(0, 5).map((idea, i) => ({
        id: Date.now() + i,
        ...idea,
      }))
      setIdeas(picked)
      setLoading(false)
    }, 600)
  }

  return (
    <div className="panel-section">
      <div className="panel-heading">
        <h3>Content Ideas</h3>
        <span className="count">{ideas.length}</span>
      </div>

      <button className="gen-btn" onClick={generateIdeas} disabled={loading}>
        {loading ? 'Generating...' : '✣ Generate 5 ideas'}
      </button>

      {ideas.map((idea) => (
        <div className="idea-item" key={idea.id}>
          <span className="idea-tag">{idea.platform}</span>
          <span>{idea.text}</span>
        </div>
      ))}

      <button className="ideas-footer-btn">View all ideas <span>›</span></button>
    </div>
  )
}
