import React from 'react'
import { getLeadInitials } from '../../services/leadService'

function statusKey(status = '') {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function labelizeStatus(status = '') {
  return status.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export default function LeadItem({ lead, onMarkContacted }) {
  return (
    <article className="lead-card crm-lead-card">
      <div className="lead-avatar">{getLeadInitials(lead.name)}</div>
      <div className="lead-body">
        <div className="lead-card-top">
          <div>
            <span className="lead-name">{lead.name || 'Untitled lead'}</span>
            <small>{lead.company || 'No company'}</small>
          </div>
          <span className={`badge ${statusKey(lead.status || 'new')}`}>
            {labelizeStatus(lead.status || 'new')}
          </span>
        </div>
        {lead.notes && <div className="lead-notes">{lead.notes}</div>}
        {onMarkContacted && lead.status !== 'contacted' && (
          <div className="lead-actions">
            <button type="button" className="mini-btn" onClick={() => onMarkContacted(lead.id)}>
              Mark Contacted
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
