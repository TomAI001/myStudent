import { deleteMediaFromServer, uploadMediaToServer } from './serverApi'

const MAX_VIDEO_BYTES = 50 * 1024 * 1024

export async function compressImage(file: File, maxSide = 1800): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * ratio)
  canvas.height = Math.round(bitmap.height * ratio)
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.84),
  )
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })
}

export async function uploadPublicFile(file: File, folder: string) {
  if (file.type.startsWith('video/') && file.size > MAX_VIDEO_BYTES) {
    throw new Error('单个视频不能超过 50MB，请先压缩后再上传。')
  }

  const prepared = file.type.startsWith('image/') ? await compressImage(file) : file
  return uploadMediaToServer(prepared, folder)
}

export async function deleteUploadedFile(path: string) {
  if (!path.startsWith('server:')) return false
  await deleteMediaFromServer(path.slice('server:'.length))
  return true
}
