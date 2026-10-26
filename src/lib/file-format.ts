// Sniffs a file's real format from its magic bytes rather than trusting the
// browser-supplied MIME type, which is easy to spoof. Shared by every admin
// upload route that accepts a file (products, course covers, meditation
// audio).

export function detectImageFormat(bytes: Uint8Array) {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return { type: 'image/png', extension: 'png' }
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { type: 'image/jpeg', extension: 'jpg' }
  }
  const text = new TextDecoder('ascii')
  if (text.decode(bytes.slice(0, 4)) === 'RIFF' && text.decode(bytes.slice(8, 12)) === 'WEBP') {
    return { type: 'image/webp', extension: 'webp' }
  }
  return null
}

export function detectAudioFormat(bytes: Uint8Array) {
  const text = new TextDecoder('ascii')
  // MP3: an ID3v2 tag header, or a bare MPEG frame sync (11 set bits).
  if (text.decode(bytes.slice(0, 3)) === 'ID3') return { type: 'audio/mpeg', extension: 'mp3' }
  if (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0) return { type: 'audio/mpeg', extension: 'mp3' }
  // WAV: RIFF container, WAVE subtype.
  if (text.decode(bytes.slice(0, 4)) === 'RIFF' && text.decode(bytes.slice(8, 12)) === 'WAVE') {
    return { type: 'audio/wav', extension: 'wav' }
  }
  // OGG (Vorbis/Opus).
  if (text.decode(bytes.slice(0, 4)) === 'OggS') return { type: 'audio/ogg', extension: 'ogg' }
  // M4A/AAC: an ISO base media file with an 'ftyp' box at offset 4.
  if (text.decode(bytes.slice(4, 8)) === 'ftyp') return { type: 'audio/mp4', extension: 'm4a' }
  return null
}
