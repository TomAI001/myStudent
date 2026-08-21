import { CircleHelp } from 'lucide-react'
import { useState } from 'react'
import { abilities, scoreLabels, type AbilityScores } from '../../lib/abilities'

export default function AbilityScorer({ value, onChange }: { value: AbilityScores; onChange: (value: AbilityScores) => void }) {
  const [guide, setGuide] = useState(0)

  return (
    <div className="ability-scorer">
      <div className="scorer-heading"><div><label>五项能力评分</label><p>各项满分 5 分，评价孩子相对自己的进步。</p></div><button type="button" onClick={() => setGuide((current) => current ? 0 : 1)}><CircleHelp size={16} /> 查看评分参考</button></div>
      {guide > 0 && (
        <div className="score-guide">
          <nav>{abilities.map((ability, index) => <button type="button" key={ability.key} className={guide === index + 1 ? 'active' : ''} onClick={() => setGuide(index + 1)}>{ability.shortName}</button>)}</nav>
          {abilities.map((ability, index) => guide === index + 1 && <div key={ability.key}><h4>{ability.name}</h4><p>{ability.description}</p><ul>{ability.criteria.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
          {guide === 1 && <div className="score-levels">{scoreLabels.map((item) => <span key={item.value}><b>{item.value}</b><strong>{item.label}</strong><small>{item.hint}</small></span>)}</div>}
        </div>
      )}
      <div className="ability-inputs">
        {abilities.map((ability) => (
          <div className="ability-input" key={ability.key}>
            <div><i style={{ background: ability.color }} /><span><strong>{ability.name}</strong><small>{ability.description}</small></span><b>{value[ability.key]} 分</b></div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={value[ability.key]}
              style={{ '--range-color': ability.color } as React.CSSProperties}
              onChange={(event) => onChange({ ...value, [ability.key]: Number(event.target.value) })}
            />
            <div className="range-labels"><span>1 · 起步</span><span>3 · 稳步</span><span>5 · 闪耀</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
