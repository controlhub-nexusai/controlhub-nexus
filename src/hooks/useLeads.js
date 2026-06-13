import { useCallback, useEffect, useState } from 'react'
import { initialLeads } from '../mockData'
import { normalizeLeadInput } from '../services/leadService'

const STORAGE_KEY = 'nexus.crm.leads'

function normalizeLead(lead = {}) {
  return {
    id: lead.id || `lead-${Date.now()}`,
    name: lead.name || '',
    company: lead.company || lead.source || '',
    phone: lead.phone || '',
    email: lead.email || '',
    source: lead.source || lead.company || '',
    status: lead.status?.toLowerCase() || 'new',
    notes: lead.notes || '',
    lastContact: lead.lastContact || lead.last_contact || null,
    createdAt: lead.createdAt || lead.created_at || new Date().toISOString(),
  }
}

function readStoredLeads() {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored).map(normalizeLead) : []
  } catch {
    return []
  }
}

function writeStoredLeads(leads) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}

function makeLead(lead) {
  const normalizedInput = normalizeLeadInput(lead)
  if (!normalizedInput.name) {
    throw new Error('Lead name is required.')
  }

  return normalizeLead({
    ...normalizedInput,
    id: `lead-${Date.now()}`,
    createdAt: new Date().toISOString(),
  })
}

export function useLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError('')
    setLeads(readStoredLeads())
    setLoading(false)
  }, [])

  const persistLeads = (nextLeads) => {
    setLeads(nextLeads)
    writeStoredLeads(nextLeads)
  }

  const addLead = async (lead) => {
    setError('')
    const createdLead = makeLead(lead)
    persistLeads([createdLead, ...leads])
    return createdLead
  }

  const updateLead = async (leadId, updates) => {
    setError('')
    const existingLead = leads.find((lead) => lead.id === leadId)
    if (!existingLead) throw new Error('Lead not found.')

    const normalizedInput = normalizeLeadInput({
      ...existingLead,
      ...updates,
    })
    const updatedLead = normalizeLead({
      ...existingLead,
      ...normalizedInput,
      id: leadId,
    })
    persistLeads(leads.map((lead) => (lead.id === leadId ? updatedLead : lead)))
    return updatedLead
  }

  const markContacted = async (leadId) => {
    const today = new Date().toISOString().slice(0, 10)
    const existingLead = leads.find((lead) => lead.id === leadId) || {}

    return updateLead(leadId, {
      ...existingLead,
      status: existingLead.status === 'new' ? 'contacted' : existingLead.status,
      lastContact: today,
    })
  }

  const deleteLead = async (leadId) => {
    setError('')
    persistLeads(leads.filter((lead) => lead.id !== leadId))
  }

  const importSampleLeads = async () => {
    const sampleLeads = initialLeads.map((lead, index) => normalizeLead({
      ...lead,
      id: `sample-lead-${index + 1}`,
      company: lead.company || lead.source || '',
      status: lead.status,
    }))
    persistLeads(sampleLeads)
    return sampleLeads
  }

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  return {
    leads,
    loading,
    error,
    loadLeads,
    addLead,
    updateLead,
    deleteLead,
    markContacted,
    importSampleLeads,
  }
}
