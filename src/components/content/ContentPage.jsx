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
  onOpenJarvis,
}) {
  const contentItems = useMemo(() => [
    ...generatedContent.map((item) => ({
      ...item,
      notes: item.content,
    })),
    ...ideas,
  ], [generatedContent, ideas])

  return (
    <div className="page simple-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Content</span>
          <h2>Content List</h2>
        </div>
        <button type="button" className="add-task-toggle" onClick={onOpenJarvis}>Ask Jarvis</button>
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
        />
      )}
    </div>
  )
}
