import { supabase } from '../lib/supabase'

const FALLBACK_PROFILE = {
  name: '',
  role: '',
  project_name: '',
  primary_goal: '',
  brand_focus: '',
  isFallback: true,
}

function getCurrentHour() {
  return new Date().getHours()
}

function normalizeProfile(profile = {}) {
  return {
    name: profile.name || '',
    role: profile.role || '',
    project_name: profile.project_name || '',
    primary_goal: profile.primary_goal || '',
    brand_focus: profile.brand_focus || '',
    isFallback: false,
  }
}

function mapNexusProfileRows(rows = []) {
  const profile = { ...FALLBACK_PROFILE, isFallback: false }

  rows.forEach((row) => {
    const key = row.profile_key
    const value = row.profile_value || ''

    if (key === 'name') profile.name = value
    if (key === 'role') profile.role = value
    if (key === 'project_name' || key === 'brand_name') profile.project_name = value
    if (key === 'primary_goal' || key === 'goal') profile.primary_goal = value
    if (key === 'brand_focus' || key === 'focus_area') profile.brand_focus = value
  })

  return profile
}

function getFallbackProfile() {
  return { ...FALLBACK_PROFILE }
}

export async function getUserProfile() {
  if (!supabase) {
    console.info('[Nexus Personalization] Using fallback profile')
    return getFallbackProfile()
  }

  try {
    const { data, error } = await supabase
      .from('nexus_profile')
      .select('profile_key, profile_value')

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn('[Nexus Personalization] Failed to load nexus_profile:', error.message || error)
      }

      console.info('[Nexus Personalization] Using fallback profile')
      return getFallbackProfile()
    }

    console.info('[Nexus Personalization]\nProfile Loaded')
    return mapNexusProfileRows(data)
  } catch (error) {
    console.warn('[Nexus Personalization] Unexpected error:', error.message || error)
    return getFallbackProfile()
  }
}

export function buildDailyGreeting(profile) {
  const safeProfile = profile || FALLBACK_PROFILE

  if (safeProfile.isFallback || !safeProfile.name) {
    return 'Selamat datang.'
  }

  const hour = getCurrentHour()

  const period =
    hour >= 5 && hour < 12
      ? 'pagi'
      : hour >= 12 && hour < 17
        ? 'siang'
        : hour >= 17 && hour < 21
          ? 'sore'
          : 'malam'

  return `Selamat ${period}, ${safeProfile.name}.`
}

export function buildUserContext(profile) {
  const safeProfile = profile || FALLBACK_PROFILE
  const greeting = buildDailyGreeting(safeProfile)

  if (safeProfile.isFallback) {
    return {
      greeting,
      role: '',
      project: '',
      focus: '',
      goal: '',
      recommendation: 'Lengkapi profil untuk pengalaman yang lebih personal.',
    }
  }

  return {
    greeting,
    role: safeProfile.role || '',
    project: safeProfile.project_name || '',
    focus: safeProfile.brand_focus || '',
    goal: safeProfile.primary_goal || '',
    recommendation: 'Fokus menyelesaikan task prioritas tinggi terlebih dahulu.',
  }
}

export function buildHomeSummary({
  profile,
  activeTasks = 0,
  highPriorityTasks = 0,
  reminders = 0,
  focus = '',
} = {}) {
  const context = buildUserContext(profile)

  return {
    greeting: context.greeting,
    role: context.role,
    project: context.project,
    focus: focus || context.focus || 'Belum ada fokus utama.',
    goal: context.goal,
    recommendation: context.recommendation,
    summary: {
      activeTasks,
      highPriorityTasks,
      reminders,
    },
  }
}

export function buildPersonalizationContext(profile) {
  const safeProfile = profile || FALLBACK_PROFILE

  return {
    name: safeProfile.name || '',
    role: safeProfile.role || '',
    project: safeProfile.project_name || '',
    goal: safeProfile.primary_goal || '',
    focus: safeProfile.brand_focus || '',
    isFallback: Boolean(safeProfile.isFallback),
  }
}

export { FALLBACK_PROFILE }
