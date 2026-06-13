import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CONTENT_STATUSES = ['idea', 'drafted', 'published']

function normalizeContentIdea(idea) {
  return {
    id: idea?.id,
    platform: idea?.platform || 'Unknown',
    title: idea?.title || 'Untitled',
    format: idea?.format || 'post',
    status: idea?.status || 'idea',
    notes: idea?.notes || '',
    createdAt: idea?.created_at,
  }
}

function toContentIdeaRow(idea) {
  const status = idea.status?.toLowerCase()

  return Object.fromEntries(
    Object.entries({
      platform: idea.platform,
      title: idea.title,
      format: idea.format,
      status: CONTENT_STATUSES.includes(status) ? status : 'idea',
      notes: idea.notes,
    }).filter(([, value]) => value !== undefined)
  )
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }
}

export function useContentIdeas() {
  const [contentIdeas, setContentIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadContentIdeas = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      requireSupabase()

      const { data, error: fetchError } = await supabase
        .from('content_ideas')
        .select('id,platform,title,format,status,notes,created_at')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setContentIdeas((data || []).map(normalizeContentIdea))
    } catch (err) {
      console.error('[Nexus Content] Failed to load content ideas:', err)
      setError('Content ideas belum tersambung.')
    } finally {
      setLoading(false)
    }
  }, [])

  const addContentIdea = async (idea) => {
    setError('')

    try {
      requireSupabase()

      const payload = toContentIdeaRow({
        platform: idea.platform || 'Instagram',
        title: idea.title,
        format: idea.format || 'post',
        status: idea.status || 'idea',
        notes: idea.notes || '',
      })

      const { data, error: insertError } = await supabase
        .from('content_ideas')
        .insert(payload)
        .select('id,platform,title,format,status,notes,created_at')
        .single()

      if (insertError) throw insertError
      await loadContentIdeas()
      const savedIdea = Array.isArray(data) ? data?.[0] : data
      return normalizeContentIdea(savedIdea)
    } catch (err) {
      console.error('[Nexus Content] Failed to add content idea:', err)
      setError('Ide konten belum tersimpan.')
      throw err
    }
  }

  const updateContentIdea = async (ideaId, updates) => {
    setError('')

    try {
      requireSupabase()

      const { data, error: updateError } = await supabase
        .from('content_ideas')
        .update(toContentIdeaRow(updates))
        .eq('id', ideaId)
        .select('id,platform,title,format,status,notes,created_at')
        .single()

      if (updateError) throw updateError
      await loadContentIdeas()
      return normalizeContentIdea(data)
    } catch (err) {
      console.error('[Nexus Content] Failed to update content idea:', err)
      setError('Ide konten gagal diperbarui.')
      throw err
    }
  }

  const deleteContentIdea = async (ideaId) => {
    setError('')

    try {
      requireSupabase()

      const { error: deleteError } = await supabase
        .from('content_ideas')
        .delete()
        .eq('id', ideaId)

      if (deleteError) throw deleteError
      await loadContentIdeas()
    } catch (err) {
      console.error('[Nexus Content] Failed to delete content idea:', err)
      setError('Ide konten gagal dihapus.')
      throw err
    }
  }

  const markAsDrafted = async (ideaId) => updateContentIdea(ideaId, { status: 'drafted' })

  const markAsPublished = async (ideaId) => updateContentIdea(ideaId, { status: 'published' })

  useEffect(() => {
    loadContentIdeas()
  }, [loadContentIdeas])

  return {
    contentIdeas,
    loading,
    error,
    loadContentIdeas,
    addContentIdea,
    updateContentIdea,
    deleteContentIdea,
    markAsDrafted,
    markAsPublished,
  }
}
