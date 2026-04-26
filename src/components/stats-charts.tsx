'use client'

import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Day = { date: string; ml: number; count: number }

function shortDate(d: string): string {
  // "2026-04-25" → "25/4"
  const [, mo, da] = d.split('-')
  return `${Number(da)}/${Number(mo)}`
}

export function StatsCharts({ last7, last30 }: { last7: Day[]; last30: Day[] }) {
  const data7 = last7.map((d) => ({ ...d, label: shortDate(d.date) }))
  const data30 = last30.map((d) => ({ ...d, label: shortDate(d.date) }))

  return (
    <div className="grid gap-4">
      <Card data-testid="chart-7">
        <CardHeader>
          <CardTitle>Tổng ml — 7 ngày gần nhất</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data7} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(value: unknown) => [`${value} ml`, 'Tổng']}
                labelFormatter={(label) => `Ngày ${label}`}
                contentStyle={{ borderRadius: 8 }}
              />
              <Bar dataKey="ml" fill="hsl(168 70% 42%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card data-testid="chart-30">
        <CardHeader>
          <CardTitle>Số lần bú/ngày — 30 ngày</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data30} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={11} interval={3} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip
                formatter={(value: unknown) => [`${value} lần`, 'Số lần']}
                labelFormatter={(label) => `Ngày ${label}`}
                contentStyle={{ borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(168 70% 42%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
