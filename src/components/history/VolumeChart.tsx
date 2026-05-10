'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, parseISO } from 'date-fns'

type DataPoint = {
  week: string   // ISO date of week start
  volume: number // kg total (sets × reps × weight)
  sessions: number
}

type Props = {
  data: DataPoint[]
  height?: number
}

const CustomTooltip = ({ active, payload }: any) => {
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
        Week of {format(parseISO(d.week), 'd MMM')}
      </div>
      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
        {d.volume.toLocaleString()} kg
        <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> total volume</span>
      </div>
      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
        {d.sessions} session{d.sessions !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export function VolumeChart({ data, height = 200 }: Props) {
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

  const maxVol = Math.max(...data.map(d => d.volume))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="week"
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
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.volume === maxVol ? '#6c63ff' : 'rgba(108,99,255,0.4)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
