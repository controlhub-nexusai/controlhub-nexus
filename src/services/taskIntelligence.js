const TASK_KEYWORD_PATTERNS = [
  /\bfollow\s*up\b/i,
  /\bfollowup\b/i,
  /\bhubungi\b/i,
  /\btelepon\b/i,
  /\bmeeting\b/i,
  /\brapat\b/i,
  /\bgym\b/i,
  /\bolahraga\b/i,
  /\bbuat(?:kan)?\b/i,
  /\bkirim\b/i,
  /\bposting\b/i,
  /\bupload\b/i,
  /\bjadwal\b/i,
  /\breminder\b/i,
  /\bingatkan\b/i,
  /\bbesok\b/i,
  /\bhari ini\b/i,
  /\bjam\b/i,
]

function hasTaskSignal(message) {
  return TASK_KEYWORD_PATTERNS.some((pattern) => pattern.test(message))
}

export function analyzeIntent(message) {
  if (!message || !hasTaskSignal(message.trim())) {
    return { type: 'chat' }
  }

  return { type: 'task' }
}
