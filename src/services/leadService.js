export const LEAD_STATUSES = ['new', 'contacted', 'follow up', 'won', 'lost']

const ACTIVE_LEAD_STATUSES = ['new', 'contacted', 'follow up']

export function isActiveLead(lead) {
  return ACTIVE_LEAD_STATUSES.includes(lead.status?.toLowerCase())
}

export function normalizeLeadInput(lead = {}) {
  const status = lead.status?.toLowerCase()

  return {
    name: lead.name?.trim(),
    company: lead.company?.trim() || lead.source?.trim() || '',
    phone: lead.phone?.trim() || '',
    email: lead.email?.trim() || '',
    source: lead.source?.trim() || '',
    status: LEAD_STATUSES.includes(status) ? status : 'new',
    notes: lead.notes?.trim() || '',
    lastContact: lead.lastContact || null,
  }
}

export function getLeadInitials(name = '') {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return initials || 'LD'
}

export function getDaysSinceContact(lastContact) {
  if (!lastContact) return null

  const contactDate = new Date(`${lastContact}T00:00:00`)
  if (Number.isNaN(contactDate.getTime())) return null

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const difference = startOfToday.getTime() - contactDate.getTime()

  return Math.floor(difference / 86400000)
}

export function getLeadCounters(leads = []) {
  const total = leads.length
  const created = leads.filter((lead) => lead.status?.toLowerCase() === 'new').length
  const contacted = leads.filter((lead) => lead.status?.toLowerCase() === 'contacted').length
  const followUp = leads.filter((lead) => lead.status?.toLowerCase() === 'follow up').length
  const won = leads.filter((lead) => lead.status?.toLowerCase() === 'won').length
  const lost = leads.filter((lead) => lead.status?.toLowerCase() === 'lost').length

  return { total, new: created, contacted, followUp, won, lost }
}

export function getLeadRecommendation(leads = []) {
  const followUpLeads = leads.filter((lead) => lead.status?.toLowerCase() === 'follow up')
  if (followUpLeads.length > 0) {
    return followUpLeads.length === 1
      ? `Follow up ${followUpLeads[0].company || followUpLeads[0].name} today.`
      : `You have ${followUpLeads.length} leads waiting for follow up.`
  }

  const staleLead = leads
    .filter((lead) => isActiveLead(lead))
    .map((lead) => ({
      ...lead,
      daysSinceContact: getDaysSinceContact(lead.lastContact),
    }))
    .filter((lead) => lead.daysSinceContact !== null && lead.daysSinceContact > 3)
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact)[0]

  if (staleLead) {
    return `Follow up ${staleLead.company || staleLead.name} today.`
  }

  const inactiveCount = leads
    .map((lead) => getDaysSinceContact(lead.lastContact))
    .filter((days) => days !== null && days >= 7).length

  if (inactiveCount > 0) {
    return `${inactiveCount} leads have been inactive for 7 days.`
  }

  return 'Your pipeline is clear. Add the next qualified lead.'
}
