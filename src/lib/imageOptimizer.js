const QUALITY_PRESETS = {
  save: { maxEdge: 1280, quality: 0.70 },
  balanced: { maxEdge: 1600, quality: 0.80 },
  high: { maxEdge: 2048, quality: 0.88 },
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be decoded. Try a JPEG, PNG, WebP, or a different iPhone photo.')) }
    image.src = url
  })
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image compression failed.')), type, quality))
}

async function fingerprint(blob) {
  const buffer = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function optimiseImage(file, options = {}) {
  if (!file?.type?.startsWith('image/') && !/\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file?.name || '')) throw new Error('Select an image file.')
  const preset = QUALITY_PRESETS[options.qualityMode || localStorage.getItem('fitlife-photo-quality') || 'balanced'] || QUALITY_PRESETS.balanced
  const image = await loadImage(file)
  const longEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const ratio = longEdge > preset.maxEdge ? preset.maxEdge / longEdge : 1
  const width = Math.max(1, Math.round(image.naturalWidth * ratio))
  const height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  let mimeType = 'image/webp'
  let blob = await canvasBlob(canvas, mimeType, preset.quality)
  if (!blob.type || blob.size === 0) {
    mimeType = 'image/jpeg'
    blob = await canvasBlob(canvas, mimeType, preset.quality)
  }
  const extension = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const base = (file.name || 'fitlife-photo').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 60)
  const output = new File([blob], `${base}.${extension}`, { type: mimeType, lastModified: Date.now() })
  return {
    file: output,
    width,
    height,
    mimeType,
    originalBytes: file.size,
    optimisedBytes: output.size,
    savedPercent: file.size ? Math.max(0, Math.round((1 - output.size / file.size) * 100)) : 0,
    fingerprint: await fingerprint(output),
  }
}

export async function optimiseAndUploadImage({ file, supabase, bucket = 'fitlife-media', folder = 'general', userId, qualityMode, crop = { x: 50, y: 50, scale: 1 } }) {
  if (!supabase || !userId) throw new Error('Sign in before uploading an image.')
  const result = await optimiseImage(file, { qualityMode })
  const path = `${userId}/${folder}/${Date.now()}-${result.fingerprint.slice(0, 16)}.${result.file.name.split('.').pop()}`
  const duplicateKey = `fitlife-media-fingerprint-${result.fingerprint}`
  const existing = localStorage.getItem(duplicateKey)
  if (existing) return { ...result, bucket, path: existing, duplicate: true, crop }
  const { error } = await supabase.storage.from(bucket).upload(path, result.file, { cacheControl: '31536000', contentType: result.mimeType, upsert: false })
  if (error) throw error
  localStorage.setItem(duplicateKey, path)
  return { ...result, bucket, path, duplicate: false, crop }
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
