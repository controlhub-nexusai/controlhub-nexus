const PLATFORM_META = {
  instagram: {
    icon: '📸',
    label: 'Instagram',
    badgeClass: 'platform-badge instagram',
    colorClass: 'platform-color-instagram',
  },
  x: {
    icon: '✕',
    label: 'X',
    badgeClass: 'platform-badge x',
    colorClass: 'platform-color-x',
  },
  youtube: {
    icon: '▶',
    label: 'YouTube',
    badgeClass: 'platform-badge youtube',
    colorClass: 'platform-color-youtube',
  },
  whatsapp: {
    icon: '💬',
    label: 'WhatsApp',
    badgeClass: 'platform-badge whatsapp',
    colorClass: 'platform-color-whatsapp',
  },
}

function normalizePlatform(platform = '') {
  return platform.toLowerCase().replace(/\s+/g, '')
}

export function getPlatformIcon(platform) {
  const normalizedPlatform = normalizePlatform(platform)

  return PLATFORM_META[normalizedPlatform] || {
    icon: '◎',
    label: platform || 'Platform',
    badgeClass: 'platform-badge generic',
    colorClass: 'platform-color-generic',
  }
}
