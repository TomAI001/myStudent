import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { recordToRadar } from '../lib/abilities'
import type { AbilityScores } from '../lib/abilities'

export default function AbilityRadar({ record, compact = false }: { record: AbilityScores; compact?: boolean }) {
  const data = recordToRadar(record)
  return (
    <div className={`radar-wrap ${compact ? 'compact' : ''}`} aria-label="五项能力雷达图">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="67%">
          <PolarGrid gridType="polygon" stroke="#c9d5d0" />
          <PolarAngleAxis dataKey="ability" tick={{ fill: '#34423d', fontSize: compact ? 11 : 13, fontWeight: 700 }} />
          <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fill: '#8a9892', fontSize: 9 }} axisLine={false} />
          <Tooltip formatter={(value) => [`${value} 分`, '本节表现']} labelFormatter={(_, payload) => payload[0]?.payload.fullName ?? ''} />
          <Radar dataKey="score" stroke="#2878ff" fill="#2878ff" fillOpacity={0.23} strokeWidth={3} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
