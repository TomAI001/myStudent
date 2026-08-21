import { Bold, Code2, Heading2, ImagePlus, Link2, List, ListOrdered, Paperclip, Quote, Redo2, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { uploadPublicFile } from '../../lib/uploads'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  uploadFolder: string
  minHeight?: number
}

export default function RichTextEditor({ label, value, onChange, uploadFolder, minHeight = 220 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value
  }, [value])

  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const insertLink = () => {
    const url = window.prompt('请输入链接地址（含 https://）')
    if (url) command('createLink', url)
  }

  const handleUpload = async (file: File, mode: 'image' | 'attachment') => {
    setUploading(true)
    try {
      const result = await uploadPublicFile(file, uploadFolder)
      editorRef.current?.focus()
      if (mode === 'image') {
        document.execCommand('insertHTML', false, `<figure><img src="${result.url}" alt="${file.name}" /><figcaption>${file.name}</figcaption></figure>`)
      } else {
        document.execCommand('insertHTML', false, `<p><a href="${result.url}" target="_blank" rel="noopener">📎 ${file.name}</a></p>`)
      }
      if (editorRef.current) onChange(editorRef.current.innerHTML)
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rich-editor-field">
      <label>{label}</label>
      <div className="editor-shell">
        <div className="editor-toolbar">
          <button type="button" title="撤销" onClick={() => command('undo')}><Undo2 /></button>
          <button type="button" title="重做" onClick={() => command('redo')}><Redo2 /></button>
          <span />
          <button type="button" title="标题" onClick={() => command('formatBlock', 'h2')}><Heading2 /></button>
          <button type="button" title="粗体" onClick={() => command('bold')}><Bold /></button>
          <button type="button" title="引用" onClick={() => command('formatBlock', 'blockquote')}><Quote /></button>
          <button type="button" title="代码块" onClick={() => command('formatBlock', 'pre')}><Code2 /></button>
          <button type="button" title="无序列表" onClick={() => command('insertUnorderedList')}><List /></button>
          <button type="button" title="有序列表" onClick={() => command('insertOrderedList')}><ListOrdered /></button>
          <button type="button" title="插入链接" onClick={insertLink}><Link2 /></button>
          <span />
          <button type="button" title="插入图片" disabled={uploading} onClick={() => imageInput.current?.click()}><ImagePlus /></button>
          <button type="button" title="插入附件" disabled={uploading} onClick={() => fileInput.current?.click()}><Paperclip /></button>
          {uploading && <small>上传中…</small>}
        </div>
        <div
          ref={editorRef}
          className="editor-content rich-content"
          contentEditable
          suppressContentEditableWarning
          style={{ minHeight }}
          data-placeholder="从这里开始写…"
          onInput={(event) => onChange(event.currentTarget.innerHTML)}
          onBlur={(event) => onChange(event.currentTarget.innerHTML)}
        />
      </div>
      <input ref={imageInput} hidden type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0], 'image')} />
      <input ref={fileInput} hidden type="file" accept=".pdf,.zip,.txt,image/*" onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0], 'attachment')} />
    </div>
  )
}
