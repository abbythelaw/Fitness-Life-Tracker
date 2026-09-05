import { del, get, set } from 'idb-keyval'

// Downscale + re-encode uploads to a Blob so photos never bloat localStorage/Supabase rows.
const compressImageToBlob = (file, maxWidth = 800, quality = 0.75) => new Promise((resolve, reject) => {
  if (!file) { resolve(null); return }
  const reader = new FileReader()
  reader.onerror = reject
  reader.onload = () => {
    const img = new Image()
    img.onerror = reject
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    }
    img.src = String(reader.result || '')
  }
  reader.readAsDataURL(file)
})

// Compress the file and persist the resulting Blob in IndexedDB, returning only the lookup key.
export const savePhoto = async (file) => {
  const blob = await compressImageToBlob(file)
  if (!blob) return null
  const photoRef = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await set(photoRef, blob)
  return photoRef
}

export const savePhotos = async (files) => {
  const refs = await Promise.all(Array.from(files || []).map((file) => savePhoto(file).catch(() => null)))
  return refs.filter(Boolean)
}

// Resolves a photoRef to a fresh object URL. Caller is responsible for revoking it.
export const getPhotoUrl = async (photoRef) => {
  if (!photoRef) return null
  const blob = await get(photoRef)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export const deletePhoto = async (photoRef) => {
  if (!photoRef) return
  await del(photoRef)
}

export const deletePhotos = async (photoRefs) => {
  await Promise.all((photoRefs || []).map((photoRef) => deletePhoto(photoRef)))
}
