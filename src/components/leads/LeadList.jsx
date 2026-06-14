import React from 'react'
import LeadItem from './LeadItem'

export default function LeadList({ leads, onMarkContacted }) {
  if (leads.length === 0) {
    return <div className="task-empty">No leads yet. Tell Nexus to add the first one.</div>
  }

  return (
    <section className="mobile-list crm-leads-list">
      {leads.map((lead, index) => (
        <LeadItem
          key={lead.id || `${lead.name || lead.company || 'lead'}-${index}`}
          lead={lead}
          onMarkContacted={onMarkContacted}
        />
      ))}
    </section>
  )
}
