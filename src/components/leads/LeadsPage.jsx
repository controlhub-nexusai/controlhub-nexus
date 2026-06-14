import React from 'react'
import LeadList from './LeadList'

export default function LeadsPage({
  leads = [],
  loading = false,
  error = '',
  onRetry,
  onMarkContacted,
  onOpenJarvis,
}) {
  return (
    <div className="page simple-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Leads</span>
          <h2>Lead List</h2>
        </div>
        <button type="button" className="add-task-toggle" onClick={onOpenJarvis}>Ask Nexus</button>
      </div>

      {loading && <div className="task-empty">Loading leads...</div>}

      {error && (
        <div className="task-empty">
          <p>{error}</p>
          <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
        </div>
      )}

      {!loading && !error && <LeadList leads={leads} onMarkContacted={onMarkContacted} />}
    </div>
  )
}
