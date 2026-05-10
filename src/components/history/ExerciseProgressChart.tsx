'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { format, parseISO } from 'date-fns'

type DataPoint = {
  date: string
  weight: number
  reps?: number
}

type Props = {
  data: DataPoint[]
  height?: number
  color?: string
  showPR?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: '0.8125rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
        {format(parseISO(d.date), 'd MMM yyyy')}
      </div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
        {d.weight} kg
        {d.reps ? <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> × {d.reps}</span> : null}
      </div>
    </div>
  )
}

export function ExerciseProgressChart({ data, height = 200, color = '#6c63ff', showPR = true }: Props) {
  if (!data.length) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: '0.8125rem'
      }}>
        No data yet
      </div>
    )
  }

  const maxWeight = Math.max(...data.map(d => d.weight))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(parseISO(v), 'd MMM')}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          unit="kg"
        />
        <Tooltip content={<CustomTooltip />} />
        {showPR && (
          <ReferenceLine
            y={maxWeight}
            stroke={color}
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
