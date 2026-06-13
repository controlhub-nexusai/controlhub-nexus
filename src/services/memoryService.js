import { supabase } from '../lib/supabase'

const PROFILE_FIELDS = [
  'brand_name',
  'focus_area',
  'target_audience',
  'content_style',
  'goal',
  'platforms',
]

const DEFAULT_PROFILE = {
  brand_name: 'ControlHub Nexus AI',
  focus_area: 'AI Automation',
  target_audience: 'Solo Founder',
  content_style: 'Educational',
  goal: 'Build AI branding and reduce repetitive work',
  platforms: 'Instagram, X, YouTube, WhatsApp',
}

const DEFAULT_MEMORIES = [
  { key: 'project', value: 'ControlHub Nexus AI', type: 'project' },
  { key: 'goal', value: 'build AI branding and reduce repetitive work', type: 'goal' },
  { key: 'platforms', value: 'Instagram, X, YouTube', type: 'platforms' },
]

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }
}

function normalizeProfileRows(rows = []) {
  return rows.reduce(
    (profile, row) => {
      if (PROFILE_FIELDS.includes(row.profile_key)) {
        profile[row.profile_key] = row.profile_value || DEFAULT_PROFILE[row.profile_key]
      }

      return profile
    },
    { ...DEFAULT_PROFILE }
  )
}

function normalizeMemory(memory) {
  return {
    id: memory.id,
    key: memory.key,
    value: memory.value,
    type: memory.type,
    createdAt: memory.created_at,
  }
}

function getFallbackMemories() {
  return DEFAULT_MEMORIES.map((memory, index) => ({
    id: `fallback-${memory.key}-${index}`,
    key: memory.key,
    value: memory.value,
    type: memory.type,
    createdAt: new Date().toISOString(),
    isFallback: true,
  }))
}

export async function getProfile() {
  if (!supabase) {
    return { ...DEFAULT_PROFILE }
  }

  const { data, error } = await supabase
    .from('nexus_profile')
    .select('profile_key,profile_value')
    .in('profile_key', PROFILE_FIELDS)

  if (error) {
    console.warn('[Nexus Memory] Failed to load branding profile:', error.message || error)
    return { ...DEFAULT_PROFILE }
  }

  if (!data || data.length === 0) {
    return { ...DEFAULT_PROFILE }
  }

  return normalizeProfileRows(data)
}

export async function saveProfile(profile = {}) {
  const nextProfile = {
    ...DEFAULT_PROFILE,
    ...profile,
  }

  if (!supabase) {
    return nextProfile
  }

  const payload = PROFILE_FIELDS.map((field) => ({
    profile_key: field,
    profile_value: nextProfile[field],
  }))

  const { data, error } = await supabase
    .from('nexus_profile')
    .upsert(payload, { onConflict: 'profile_key' })
    .select('profile_key,profile_value')

  if (error) {
    console.error('[Nexus Memory] Failed to save branding profile:', error)
    return nextProfile
  }

  return normalizeProfileRows(data)
}

export async function updateProfile(updates = {}) {
  const currentProfile = await getProfile()
  return saveProfile({
    ...currentProfile,
    ...updates,
  })
}

export function buildBrandContext(profile = DEFAULT_PROFILE) {
  const nextProfile = {
    ...DEFAULT_PROFILE,
    ...profile,
  }

  return [
    `Brand: ${nextProfile.brand_name}`,
    '',
    'Focus:',
    nextProfile.focus_area,
    '',
    'Audience:',
    nextProfile.target_audience,
    '',
    'Style:',
    nextProfile.content_style,
    '',
    'Goal:',
    nextProfile.goal,
  ].join('\n')
}

async function seedDefaultMemory() {
  const { error } = await supabase
    .from('memory')
    .insert(DEFAULT_MEMORIES)

  if (error) {
    console.error('[Nexus Memory] Failed to seed default memory:', error)
    throw error
  }
}

export async function loadMemory() {
  if (!supabase) {
    return getFallbackMemories()
  }

  const { data, error } = await supabase
    .from('memory')
    .select('id,key,value,type,created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[Nexus Memory] Failed to load memory:', error.message || error)
    return getFallbackMemories()
  }

  if (!data || data.length === 0) {
    await seedDefaultMemory()
    return loadMemory()
  }

  return data.map(normalizeMemory)
}

export async function addMemory(key, value, type = 'manual') {
  requireSupabase()

  const payload = { key, value, type }
  const { data, error } = await supabase
    .from('memory')
    .insert(payload)
    .select('id,key,value,type,created_at')
    .single()

  if (error) {
    console.error('[Nexus Memory] Failed to add memory:', error)
    throw error
  }

  return normalizeMemory(data)
}

export async function updateMemory(id, value) {
  requireSupabase()

  const { data, error } = await supabase
    .from('memory')
    .update({ value })
    .eq('id', id)
    .select('id,key,value,type,created_at')
    .single()

  if (error) {
    console.error('[Nexus Memory] Failed to update memory:', error)
    throw error
  }

  return normalizeMemory(data)
}

export async function deleteMemory(id) {
  requireSupabase()

  const { error } = await supabase
    .from('memory')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[Nexus Memory] Failed to delete memory:', error)
    throw error
  }
}
