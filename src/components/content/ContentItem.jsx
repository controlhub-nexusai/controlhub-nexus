import React from 'react'
import { getPlatformIcon } from '../../utils/platformIcons'

function labelizeStatus(status = '') {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function ContentItem({ item, onMarkDrafted, onMarkPublished, onDeleteContent }) {
  const platform = getPlatformIcon(item.platform)

  return (
    <article className={`idea-item content-idea-card ${platform.colorClass}`}>
      <div className="content-idea-main">
        <div className="content-idea-head">
          <span className={platform.badgeClass}>
            <span>{platform.icon}</span>
            {platform.label}
          </span>
          <span className={`content-status ${item.status || 'idea'}`}>
            {labelizeStatus(item.status || 'idea')}
          </span>
        </div>
        <strong>{item.title || 'Untitled content'}</strong>
        {item.notes && <p>{item.notes}</p>}
      </div>
      <div className="content-idea-actions">
        {item.status === 'idea' && onMarkDrafted && (
          <button type="button" onClick={() => onMarkDrafted(item.id)}>Mark Drafted</button>
        )}
        {item.status === 'drafted' && onMarkPublished && (
          <button type="button" onClick={() => onMarkPublished(item.id)}>Mark Published</button>
        )}
        {onDeleteContent && (
          <button type="button" onClick={() => onDeleteContent(item)}>Delete</button>
        )}
      </div>
    </article>
  )
}
