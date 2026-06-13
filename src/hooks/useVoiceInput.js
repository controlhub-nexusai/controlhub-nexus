import { useEffect, useRef, useState } from 'react'

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useVoiceInput({ lang = 'id-ID', onTranscript } = {}) {
  const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition()

    if (!SpeechRecognition) {
      setVoiceError('Browser tidak mendukung voice input.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceError('')
    }

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      if (transcript) onTranscript?.(transcript)
    }

    recognition.onerror = (event) => {
      setVoiceError(event.error === 'not-allowed'
        ? 'Izin mikrofon ditolak.'
        : 'Voice input gagal. Coba lagi.')
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [lang, onTranscript])

  const startListening = () => {
    const recognition = recognitionRef.current

    if (!recognition) {
      setVoiceError('Browser tidak mendukung voice input.')
      return
    }

    try {
      recognition.start()
    } catch {
      setVoiceError('Voice input sedang aktif.')
    }
  }

  return {
    isListening,
    voiceError,
    startListening,
  }
}
