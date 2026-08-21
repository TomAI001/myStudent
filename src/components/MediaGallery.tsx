import { Image as ImageIcon, Play } from 'lucide-react'
import { useState } from 'react'
import type { MediaItem } from '../lib/types'

export default function MediaGallery({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState<MediaItem | null>(null)
  if (!items.length) return null

  return (
    <>
      <div className="media-gallery">
        {items.map((item, index) => (
          <button type="button" key={item.id} onClick={() => setActive(item)} className="media-thumb">
            {item.kind === 'image' ? (
              <img src={item.url} alt={item.caption || `课堂照片 ${index + 1}`} loading="lazy" />
            ) : (
              <>
                <video src={item.url} preload="metadata" muted />
                <span className="play-badge"><Play size={18} fill="currentColor" /></span>
              </>
            )}
            <span className="media-index">{item.kind === 'image' ? <ImageIcon size={12} /> : <Play size={12} />} {index + 1}</span>
          </button>
        ))}
      </div>
      {active && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setActive(null)}>
          <button type="button" className="lightbox-close" onClick={() => setActive(null)}>关闭</button>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            {active.kind === 'image' ? (
              <img src={active.url} alt={active.caption || '课堂照片'} />
            ) : (
              <video src={active.url} controls autoPlay playsInline />
            )}
            {active.caption && <p>{active.caption}</p>}
          </div>
        </div>
      )}
    </>
  )
}
