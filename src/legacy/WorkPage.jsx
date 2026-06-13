import React, { useMemo, useState } from 'react'
import {
  getLeadCounters,
  getLeadInitials,
  getLeadRecommendation,
  LEAD_STATUSES,
} from '../services/leadService'

const EMPTY_FORM = {
  name: '',
  company: '',
  phone: '',
  email: '',
  status: 'new',
  notes: '',
}

function statusKey(status = '') {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function badgeClass(status) {
  return `badge ${statusKey(status)}`
}

function labelizeStatus(status = '') {
  return status.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function LeadForm({ value, submitting, onChange, onSubmit, onCancel }) {
  return (
    <form className="lead-form" onSubmit={onSubmit}>
      <div className="lead-form-grid">
        <label>
          <span>Lead Name</span>
          <input
            type="text"
            value={value.name}
            placeholder="Sarah Lee"
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            required
          />
        </label>

        <label>
          <span>Company</span>
          <input
            type="text"
            value={value.company}
            placeholder="PT ABC"
            onChange={(event) => onChange({ ...value, company: event.target.value })}
          />
        </label>

        <label>
          <span>Phone</span>
          <input
            type="tel"
            value={value.phone}
            placeholder="+62..."
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
          />
        </label>

        <label>
          <span>Email</span>
          <input
            type="email"
            value={value.email}
            placeholder="name@company.com"
            onChange={(event) => onChange({ ...value, email: event.target.value })}
          />
        </label>

        <label>
          <span>Status</span>
          <select
            value={value.status}
            onChange={(event) => onChange({ ...value, status: event.target.value })}
          >
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>{labelizeStatus(status)}</option>
            ))}
          </select>
        </label>

        <label className="lead-form-notes">
          <span>Notes</span>
          <textarea
            value={value.notes}
            placeholder="Customer context, needs, and next step."
            rows={3}
            onChange={(event) => onChange({ ...value, notes: event.target.value })}
          />
        </label>
      </div>

      <div className="lead-form-actions">
        <button type="submit" className="lead-primary-btn" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Lead'}
        </button>
        <button type="button" className="ghost-btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function LeadDetails({ lead, onEdit, onMarkContacted, onMarkFollowUp, onMarkClosed }) {
  return (
    <div className="lead-detail-card">
      <div className="lead-detail-profile">
        <div className="lead-avatar lead-detail-avatar">{getLeadInitials(lead.name)}</div>
        <div>
          <strong>{lead.name}</strong>
          <span className={badgeClass(lead.status)}>{labelizeStatus(lead.status)}</span>
        </div>
      </div>

      <div className="lead-detail-summary">
        <div><span>Company</span><strong>{lead.company || '-'}</strong></div>
        <div><span>Email</span><strong>{lead.email || '-'}</strong></div>
        <div><span>Phone</span><strong>{lead.phone || '-'}</strong></div>
      </div>

      <div className="lead-detail-notes">
        <span>Notes</span>
        <p>{lead.notes || '-'}</p>
      </div>

      <div className="lead-detail-actions">
        <button type="button" onClick={onEdit}>Edit Lead</button>
        <button type="button" onClick={onMarkContacted}>Mark Contacted</button>
        <button type="button" onClick={onMarkFollowUp}>Mark Follow Up</button>
        <button type="button" onClick={onMarkClosed}>Mark Closed</button>
      </div>
    </div>
  )
}

export default function WorkPage({
  leads,
  loading,
  error,
  onRetry,
  onAddLead,
  onUpdateLead,
  onImportSampleLeads,
}) {
  const [modalMode, setModalMode] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const counters = useMemo(() => getLeadCounters(leads), [leads])
  const insight = useMemo(() => getLeadRecommendation(leads), [leads])
  const modalTitle = modalMode === 'view'
    ? 'Lead Details'
    : modalMode === 'edit'
      ? 'Edit Lead'
      : 'Add Lead'

  const closeModal = () => {
    setModalMode('')
    setSelectedLead(null)
    setForm(EMPTY_FORM)
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setSelectedLead(null)
    setModalMode('create')
  }

  const openView = (lead) => {
    setSelectedLead(lead)
    setModalMode('view')
  }

  const openEdit = (lead) => {
    setSelectedLead(lead)
    setForm({
      name: lead.name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      status: lead.status || 'new',
      notes: lead.notes || '',
    })
    setModalMode('edit')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    try {
      if (modalMode === 'edit' && selectedLead) {
        await onUpdateLead(selectedLead.id, form)
      } else {
        await onAddLead(form)
      }
      closeModal()
    } finally {
      setSubmitting(false)
    }
  }

  const updateSelectedLeadStatus = async (status) => {
    if (!selectedLead) return

    const updates = {
      ...selectedLead,
      status,
      lastContact: status === 'contacted' ? new Date().toISOString().slice(0, 10) : selectedLead.lastContact,
    }
    const updatedLead = await onUpdateLead(selectedLead.id, updates)
    setSelectedLead(updatedLead)
  }

  const renderLead = (lead) => (
    <article className="lead-card crm-lead-card" key={lead.id}>
      <div className="lead-avatar">{getLeadInitials(lead.name)}</div>
      <div className="lead-body">
        <div className="lead-card-top">
          <div>
            <span className="lead-name">{lead.name}</span>
            <small>{lead.company || 'No company'}</small>
          </div>
          <span className={badgeClass(lead.status)}>{labelizeStatus(lead.status)}</span>
        </div>
        {lead.notes && <div className="lead-notes">{lead.notes}</div>}
        <div className="lead-actions">
          <button type="button" className="mini-btn" onClick={() => openView(lead)}>View</button>
          <button type="button" className="mini-btn" onClick={() => openEdit(lead)}>Edit</button>
        </div>
      </div>
    </article>
  )

  return (
    <div className="page lead-manager-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Leads Overview</span>
          <h2>Leads CRM</h2>
        </div>
        <button type="button" className="add-task-toggle" onClick={openCreate}>+ Add Lead</button>
      </div>

      <section className="lead-counter-grid crm-counter-grid" aria-label="Leads Overview">
        <div className="lead-counter-card"><small>Total Leads</small><strong>{counters.total}</strong></div>
        <div className="lead-counter-card"><small>New</small><strong>{counters.new}</strong></div>
        <div className="lead-counter-card"><small>Contacted</small><strong>{counters.contacted}</strong></div>
        <div className="lead-counter-card"><small>Follow Up</small><strong>{counters.followUp}</strong></div>
        <div className="lead-counter-card"><small>Won</small><strong>{counters.won}</strong></div>
        <div className="lead-counter-card"><small>Lost</small><strong>{counters.lost}</strong></div>
      </section>

      {loading && <div className="task-empty">Loading leads...</div>}

      {error && (
        <div className="task-empty">
          <p>{error}</p>
          <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
        </div>
      )}

      {!loading && !error && leads.length === 0 ? (
        <section className="crm-empty-state">
          <strong>📈 No leads yet</strong>
          <p>Start building your pipeline.</p>
          <div>
            <button type="button" onClick={openCreate}>Add Lead</button>
            <button type="button" onClick={onImportSampleLeads}>Import Sample Leads</button>
          </div>
        </section>
      ) : !loading && !error && (
        <section className="mobile-list crm-leads-list">
          {leads.map(renderLead)}
        </section>
      )}

      <section className="task-hint lead-recommendation crm-lead-insight">
        <span className="eyebrow">Lead Insight</span>
        <p>{insight}</p>
      </section>

      {modalMode && (
        <div className="lead-modal-backdrop" role="presentation">
          <section className="lead-modal" role="dialog" aria-modal="true" aria-label={modalTitle}>
            <div className="lead-modal-head">
              <span className="eyebrow">{modalTitle}</span>
              <button type="button" aria-label="Close lead modal" onClick={closeModal}>×</button>
            </div>
            {modalMode === 'view' && selectedLead ? (
              <LeadDetails
                lead={selectedLead}
                onEdit={() => openEdit(selectedLead)}
                onMarkContacted={() => updateSelectedLeadStatus('contacted')}
                onMarkFollowUp={() => updateSelectedLeadStatus('follow up')}
                onMarkClosed={() => updateSelectedLeadStatus('lost')}
              />
            ) : (
              <LeadForm
                value={form}
                submitting={submitting}
                onChange={setForm}
                onSubmit={handleSubmit}
                onCancel={closeModal}
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
