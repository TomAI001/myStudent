import { ImagePlus, LoaderCircle, Play, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { addMedia, removeMedia } from '../../lib/data'
import type { MediaItem } from '../../lib/types'
import { uploadPublicFile } from '../../lib/uploads'

export default function MediaManager({ recordId, items, onChange }: { recordId: string; items: MediaItem[]; onChange: (items: MediaItem[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const uploadFiles = async (files: FileList) => {
    setUploading(true)
    try {
      const created: MediaItem[] = []
      for (const [index, file] of Array.from(files).entries()) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
        const upload = await uploadPublicFile(file, `records/${recordId}`)
        created.push(await addMedia({
          record_id: recordId,
          kind: file.type.startsWith('video/') ? 'video' : 'image',
          url: upload.url,
          storage_path: upload.path,
          caption: null,
          sort_order: items.length + index,
        }))
      }
      onChange([...items, ...created])
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : '上传失败')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (item: MediaItem) => {
    if (!window.confirm('确定删除这项照片或视频吗？')) return
    await removeMedia(item)
    onChange(items.filter((current) => current.id !== item.id))
  }

  return (
    <div className="media-manager">
      <div className="media-manager-title"><div><label>课堂照片与视频</label><p>图片会自动压缩；单个视频不超过 50MB。</p></div><button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="spin" /> : <UploadCloud />} {uploading ? '正在上传' : '选择文件'}</button></div>
      <input ref={inputRef} hidden multiple type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={(event) => event.target.files && uploadFiles(event.target.files)} />
      {items.length ? <div className="admin-media-grid">{items.map((item) => <div key={item.id}>{item.kind === 'image' ? <img src={item.url} alt="课堂记录" loading="lazy" decoding="async" /> : <video src={item.url} muted preload="none" />}<span>{item.kind === 'image' ? <ImagePlus /> : <Play />}</span><button type="button" onClick={() => remove(item)}><Trash2 /></button></div>)}</div> : <div className="media-drop-empty"><ImagePlus /><span>保存评价后，可上传这节课的照片和短视频</span></div>}
    </div>
  )
}
