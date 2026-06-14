import React from 'react'
import ContentItem from './ContentItem'

export default function ContentList({ items, onMarkDrafted, onMarkPublished, onDeleteContent }) {
  if (items.length === 0) {
    return <div className="task-empty">No content yet. Ask Nexus to create the next idea.</div>
  }

  return (
    <div className="content-groups">
      {items.map((item, index) => (
        <ContentItem
          key={item.id || `${item.title || 'content'}-${index}`}
          item={item}
          onMarkDrafted={onMarkDrafted}
          onMarkPublished={onMarkPublished}
          onDeleteContent={onDeleteContent}
        />
      ))}
    </div>
  )
}
