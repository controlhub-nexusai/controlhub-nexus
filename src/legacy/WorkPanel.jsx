import React from 'react'
import { getLeadInitials, isActiveLead } from '../services/leadService'

function badgeClass(status) {
  return `badge ${status?.toLowerCase()}`
}

function labelizeStatus(status = '') {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function WorkPanel({ leads, compact }) {
  const activeCount = leads.filter(isActiveLead).length

  return (
    <div className="panel-section">
      <div className="panel-heading">
        <h3>Leads</h3>
        <div className="panel-actions">
          <span className="count">{activeCount} active leads</span>
          <button className="text-btn">View all</button>
        </div>
      </div>

      {leads.map((lead) => (
        <div className="lead-card" key={lead.id}>
          <div className="lead-avatar">{getLeadInitials(lead.name)}</div>
          <div className="lead-body">
            <div className="lead-card-top">
              <span className="lead-name">{lead.name}</span>
              <span className={badgeClass(lead.status)}>{labelizeStatus(lead.status)}</span>
            </div>
            <div className="lead-meta">Last contact: {lead.lastContact || 'Not contacted'}</div>
            <div className="lead-notes">{lead.notes}</div>
            {!compact && (
              <div className="lead-actions">
                <button className="mini-btn">Draft message</button>
                <button className="mini-btn">Mark contacted</button>
              </div>
            )}
          </div>
        </div>
      ))}

      <button className="add-lead-btn">+ Add New Lead <span>◎</span></button>
    </div>
  )
}
