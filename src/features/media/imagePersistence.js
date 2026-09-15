export async function compressImageToDataUrl(file, maxEdge = 1400, quality = 0.78) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', quality)
}

export async function dataUrlToBlob(dataUrl) {
  return await (await fetch(dataUrl)).blob()
}

export function isDisplayablePhotoSource(value) {
  return typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('https://'))
}
