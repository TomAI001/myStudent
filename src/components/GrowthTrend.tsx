import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { abilities } from '../lib/abilities'
import type { Lesson, LessonRecordWithMedia } from '../lib/types'

export default function GrowthTrend({ lessons, records }: { lessons: Lesson[]; records: LessonRecordWithMedia[] }) {
  const byLesson = new Map(records.map((record) => [record.lesson_id, record]))
  const data = lessons
    .filter((lesson) => byLesson.has(lesson.id))
    .map((lesson) => ({
      name: `第${lesson.sequence_no}课`,
      ...byLesson.get(lesson.id),
    }))

  return (
    <div className="trend-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#d9e2dd" />
          <XAxis dataKey="name" tick={{ fill: '#62716b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: '#82908a', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value, name) => [`${value} 分`, abilities.find((item) => item.key === name)?.name ?? name]} />
          <Legend formatter={(value) => abilities.find((item) => item.key === value)?.shortName ?? value} wrapperStyle={{ fontSize: 12 }} />
          {abilities.map((ability) => (
            <Line key={ability.key} type="monotone" dataKey={ability.key} stroke={ability.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
