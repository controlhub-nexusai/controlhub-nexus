import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const GENERATED_CONTENT_STATUSES = ['draft', 'approved', 'published']

function normalizeGeneratedContent(item) {
  return {
    id: item?.id,
    platform: item?.platform || 'Unknown',
    title: item?.title || 'Untitled',
    content: item?.content || '',
    status: item?.status || 'draft',
    createdAt: item?.created_at,
  }
}

function toGeneratedContentRow(item) {
  const status = item.status?.toLowerCase()

  return Object.fromEntries(
    Object.entries({
      platform: item.platform,
      title: item.title,
      content: item.content,
      status: GENERATED_CONTENT_STATUSES.includes(status) ? status : 'draft',
    }).filter(([, value]) => value !== undefined)
  )
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not configured.')
  }
}

export function useGeneratedContent() {
  const [generatedContent, setGeneratedContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadGeneratedContent = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      requireSupabase()

      const { data, error: fetchError } = await supabase
        .from('generated_content')
        .select('id,platform,title,content,status,created_at')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setGeneratedContent((data || []).map(normalizeGeneratedContent))
    } catch (err) {
      console.error('[Nexus Content] Failed to load generated content:', err)
      setError('Generated content belum tersambung.')
    } finally {
      setLoading(false)
    }
  }, [])

  const addGeneratedContent = async (contentItem) => {
    setError('')

    try {
      requireSupabase()

      const payload = toGeneratedContentRow({
        platform: contentItem.platform || 'Instagram',
        title: contentItem.title || 'Untitled',
        content: contentItem.content || '',
        status: contentItem.status || 'draft',
      })

      const { data, error: insertError } = await supabase
        .from('generated_content')
        .insert(payload)
        .select('id,platform,title,content,status,created_at')
        .single()

      if (insertError) throw insertError
      await loadGeneratedContent()
      const savedContent = Array.isArray(data) ? data?.[0] : data
      return normalizeGeneratedContent(savedContent)
    } catch (err) {
      console.error('[Nexus Content] Failed to add generated content:', err)
      setError('Konten belum tersimpan.')
      throw err
    }
  }

  const updateGeneratedContent = async (contentId, updates) => {
    setError('')

    try {
      requireSupabase()

      const { data, error: updateError } = await supabase
        .from('generated_content')
        .update(toGeneratedContentRow(updates))
        .eq('id', contentId)
        .select('id,platform,title,content,status,created_at')
        .single()

      if (updateError) throw updateError
      await loadGeneratedContent()
      return normalizeGeneratedContent(data)
    } catch (err) {
      console.error('[Nexus Content] Failed to update generated content:', err)
      setError('Konten gagal diperbarui.')
      throw err
    }
  }

  const deleteGeneratedContent = async (contentId) => {
    setError('')

    try {
      requireSupabase()

      const { error: deleteError } = await supabase
        .from('generated_content')
        .delete()
        .eq('id', contentId)

      if (deleteError) throw deleteError
      await loadGeneratedContent()
    } catch (err) {
      console.error('[Nexus Content] Failed to delete generated content:', err)
      setError('Konten gagal dihapus.')
      throw err
    }
  }

  const approveGeneratedContent = async (contentId) => updateGeneratedContent(contentId, { status: 'approved' })

  const publishGeneratedContent = async (contentId) => updateGeneratedContent(contentId, { status: 'published' })

  useEffect(() => {
    loadGeneratedContent()
  }, [loadGeneratedContent])

  return {
    generatedContent,
    loading,
    error,
    loadGeneratedContent,
    addGeneratedContent,
    updateGeneratedContent,
    deleteGeneratedContent,
    approveGeneratedContent,
    publishGeneratedContent,
  }
}
