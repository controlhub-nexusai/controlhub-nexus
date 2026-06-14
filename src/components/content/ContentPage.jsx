import React, { useMemo } from 'react'
import ContentList from './ContentList'

export default function ContentPage({
  ideas = [],
  generatedContent = [],
  loading = false,
  error = '',
  onRetry,
  onMarkDrafted,
  onMarkPublished,
  onDeleteContentIdea,
  onDeleteGeneratedContent,
  onOpenJarvis,
}) {
  const contentItems = useMemo(() => [
    ...generatedContent.map((item) => ({
      ...item,
      notes: item.content,
      source: 'generated',
    })),
    ...ideas.map((item) => ({
      ...item,
      source: 'idea',
    })),
  ], [generatedContent, ideas])

  return (
    <div className="page simple-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Content</span>
          <h2>Content List</h2>
        </div>
        <button type="button" className="add-task-toggle" onClick={onOpenJarvis}>Ask Nexus</button>
      </div>

      {loading && <div className="task-empty">Loading content...</div>}

      {error && (
        <div className="task-empty">
          <p>{error}</p>
          <button type="button" className="retry-btn" onClick={onRetry}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <ContentList
          items={contentItems}
          onMarkDrafted={onMarkDrafted}
          onMarkPublished={onMarkPublished}
          onDeleteContent={(item) =>
            item.source === 'generated'
              ? onDeleteGeneratedContent?.(item.id)
              : onDeleteContentIdea?.(item.id)
          }
        />
      )}
    </div>
  )
}
