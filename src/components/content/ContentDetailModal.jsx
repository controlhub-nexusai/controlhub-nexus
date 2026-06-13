import React, { useEffect, useMemo, useState } from 'react'
import { getPlatformIcon } from '../../utils/platformIcons'

function parseContentPayload(item) {
  if (!item?.content) {
    return {
      title: item?.title || '',
      hook: '',
      caption: '',
      cta: '',
      hashtags: [],
    }
  }

  try {
    const parsed = JSON.parse(item.content)
    return {
      ...parsed,
      title: parsed.title || item.title || '',
      hook: parsed.hook || '',
      caption: parsed.caption || parsed.description || parsed.message || '',
      cta: parsed.cta || '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    }
  } catch {
    return {
      title: item.title || '',
      hook: '',
      caption: item.content,
      cta: '',
      hashtags: [],
    }
  }
}

function formatCreatedDate(createdAt) {
  if (!createdAt) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

function normalizeHashtags(value) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith('#') ? item : `#${item}`))
}

export default function ContentDetailModal({
  item,
  onClose,
  onSave,
  onApprove,
  onPublish,
  onDelete,
  onDuplicate,
}) {
  const parsedContent = useMemo(() => parseContentPayload(item), [item])
  const platform = getPlatformIcon(item?.platform || parsedContent.platform || 'Instagram')
  const [form, setForm] = useState({
    title: '',
    hook: '',
    caption: '',
    cta: '',
    hashtags: '',
  })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setForm({
      title: parsedContent.title || '',
      hook: parsedContent.hook || '',
      caption: parsedContent.caption || '',
      cta: parsedContent.cta || '',
      hashtags: (parsedContent.hashtags || []).join(', '),
    })
    setNotice('')
  }, [parsedContent])

  if (!item) return null

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    const title = form.title.trim()
    if (!title) return

    setSaving(true)
    try {
      const nextContent = {
        ...parsedContent,
        platform: item.platform,
        title,
        hook: form.hook.trim(),
        caption: form.caption.trim(),
        cta: form.cta.trim(),
        hashtags: normalizeHashtags(form.hashtags),
      }

      await onSave?.(item.id, {
        platform: item.platform,
        title,
        content: JSON.stringify(nextContent),
        status: item.status,
      })
      setNotice('✅ Perubahan berhasil disimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    await onApprove?.(item.id)
    onClose()
  }

  const handlePublish = async () => {
    await onPublish?.(item.id)
    onClose()
  }

  const handleDelete = async () => {
    await onDelete?.(item.id)
    onClose()
  }

  const handleDuplicate = async () => {
    const duplicateContent = {
      ...parsedContent,
      title: `${form.title.trim() || item.title} Copy`,
      hook: form.hook.trim(),
      caption: form.caption.trim(),
      cta: form.cta.trim(),
      hashtags: normalizeHashtags(form.hashtags),
    }

    await onDuplicate?.({
      platform: item.platform,
      title: duplicateContent.title,
      content: JSON.stringify(duplicateContent),
      status: 'draft',
    })
    setNotice('✅ Konten berhasil diduplikasi')
  }

  return (
    <div className="content-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="content-detail-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="content-modal-handle"></div>
        <div className="content-modal-head">
          <div>
            <span className="eyebrow">Content Detail</span>
            <h3>{form.title || item.title}</h3>
          </div>
          <button type="button" className="content-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="content-detail-meta">
          <span className={platform.badgeClass}>
            <span>{platform.icon}</span>
            {platform.label}
          </span>
          <span className={`content-status ${item.status}`}>{item.status}</span>
          <span>{formatCreatedDate(item.createdAt)}</span>
        </div>

        <div className="content-detail-form">
          <label>
            Title
            <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
          </label>
          <label>
            Hook
            <textarea rows={3} value={form.hook} onChange={(event) => updateForm('hook', event.target.value)} />
          </label>
          <label>
            Caption
            <textarea rows={6} value={form.caption} onChange={(event) => updateForm('caption', event.target.value)} />
          </label>
          <label>
            CTA
            <textarea rows={3} value={form.cta} onChange={(event) => updateForm('cta', event.target.value)} />
          </label>
          <label>
            Hashtags
            <textarea rows={3} value={form.hashtags} onChange={(event) => updateForm('hashtags', event.target.value)} />
          </label>
        </div>

        {notice && <p className="content-modal-notice">{notice}</p>}

        <div className="content-modal-actions">
          {item.status === 'draft' && (
            <>
              <button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={handleApprove}>Approve</button>
              <button type="button" onClick={handleDelete}>Delete</button>
            </>
          )}
          {item.status === 'approved' && (
            <>
              <button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={handlePublish}>Publish</button>
            </>
          )}
          {item.status === 'published' && (
            <>
              <button type="button" onClick={() => setNotice('Konten sedang ditampilkan.')}>View</button>
              <button type="button" onClick={handleDuplicate}>Duplicate</button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
