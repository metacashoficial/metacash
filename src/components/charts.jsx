import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { money, moneyCompact, percent } from '../lib/format'

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    setWidth(ref.current.getBoundingClientRect().width)
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

function niceMax(v) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / p
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * p
}

/** Curva monótona: suave pero sin pasar por debajo de cero. */
function monotonePath(pts) {
  const n = pts.length
  if (!n) return ''
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`
  const dx = [], m = [], t = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1)
  }
  t[0] = m[0]
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0
    else t[i] = (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i])
  }
  t[n - 1] = m[n - 2]
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`
  }
  return d
}

function Tooltip({ x, width, title, rows, currency }) {
  const ref = useRef(null)
  const [w, setW] = useState(150)
  useEffect(() => {
    if (ref.current) setW(ref.current.offsetWidth)
  })
  const left = Math.max(0, Math.min(width - w, x - w / 2))
  return (
    <div className="chart-tip" ref={ref} style={{ left }}>
      <div className="chart-tip-title">{title}</div>
      {rows.map((r) => (
        <div className="chart-tip-row" key={r.name}>
          <span className="dot" style={{ background: r.color }} />
          <span>{r.name}</span>
          <strong>{money(r.value, currency)}</strong>
        </div>
      ))}
    </div>
  )
}

/**
 * Gráfico de líneas interactivo.
 * data: [{ label, tipLabel, [key]: number }]
 * series: [{ key, name, color, area }]
 */
export function LineChart({ data, series, height = 240, currency = 'MXN' }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const id = useMemo(() => 'g' + Math.random().toString(36).slice(2, 8), [])

  const yW = 46
  const pad = { t: 14, r: 8, b: 28 }
  const innerW = Math.max(10, width - yW - pad.r)
  const innerH = height - pad.t - pad.b
  const maxVal = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key] || 0))))
  const n = data.length
  const x = (i) => yW + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1))
  const y = (v) => pad.t + innerH - (v / maxVal) * innerH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal)
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))))

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - yW) / innerW) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={yW} x2={width - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={yW - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
                {moneyCompact(t, currency)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const last = i === n - 1
            if (!last && (i % labelEvery !== 0 || x(n - 1) - x(i) < 52)) return null
            return (
              <text key={i} x={x(i)} y={height - 8} className="chart-axis" textAnchor={i === 0 ? 'start' : last ? 'end' : 'middle'}>
                {d.label}
              </text>
            )
          })}
          {series.map((s) => {
            const pts = data.map((d, i) => [x(i), y(d[s.key] || 0)])
            const line = monotonePath(pts)
            return (
              <g key={s.key}>
                {s.area && <path d={`${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id}-${s.key})`} />}
                <path d={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="chart-line" />
              </g>
            )
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} className="chart-cursor" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(data[hover][s.key] || 0)} r="4.5" fill="var(--surface)" stroke={s.color} strokeWidth="2.2" />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip
          x={x(hover)}
          width={width}
          currency={currency}
          title={data[hover].tipLabel || data[hover].label}
          rows={series.map((s) => ({ name: s.name, color: s.color, value: data[hover][s.key] || 0 }))}
        />
      )}
    </div>
  )
}

/** Barras agrupadas interactivas. */
export function BarChart({ data, series, height = 240, currency = 'MXN' }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const yW = 46
  const pad = { t: 14, r: 4, b: 28 }
  const innerW = Math.max(10, width - yW - pad.r)
  const innerH = height - pad.t - pad.b
  const maxVal = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key] || 0))))
  const band = innerW / Math.max(1, data.length)
  const groupW = Math.min(band * 0.64, 18 * series.length + 6)
  const barW = (groupW - (series.length - 1) * 3) / series.length
  const y = (v) => pad.t + innerH - (v / maxVal) * innerH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal)

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onPointerLeave={() => setHover(null)}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={yW} x2={width - pad.r} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={yW - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
                {moneyCompact(t, currency)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const gx = yW + i * band + (band - groupW) / 2
            return (
              <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <rect x={yW + i * band} y={pad.t} width={band} height={innerH} className={`chart-band ${hover === i ? 'active' : ''}`} />
                {series.map((s, j) => {
                  const v = d[s.key] || 0
                  const h = Math.max(v > 0 ? 2 : 0, innerH - (y(v) - pad.t))
                  return (
                    <rect
                      key={s.key}
                      x={gx + j * (barW + 3)}
                      y={pad.t + innerH - h}
                      width={barW}
                      height={h}
                      rx={Math.min(5, barW / 2)}
                      fill={s.color}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                      className="chart-bar"
                    />
                  )
                })}
                <text x={yW + i * band + band / 2} y={height - 8} className="chart-axis" textAnchor="middle">
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tooltip
          x={yW + hover * band + band / 2}
          width={width}
          currency={currency}
          title={data[hover].tipLabel || data[hover].label}
          rows={series.map((s) => ({ name: s.name, color: s.color, value: data[hover][s.key] || 0 }))}
        />
      )}
    </div>
  )
}

/** Dona interactiva con leyenda. items: [{label, value, color}] */
export function Donut({ items, currency = 'MXN', size = 168, centerLabel = 'Total', emptyText = 'Sin datos' }) {
  const [hover, setHover] = useState(null)
  const total = items.reduce((s, i) => s + i.value, 0)
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = items.length > 1 ? 2.5 : 0
  let acc = 0
  const active = hover !== null ? items[hover] : null

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
          {total > 0 &&
            items.map((it, i) => {
              const len = (it.value / total) * c
              const dash = Math.max(0.01, len - gap)
              const el = (
                <circle
                  key={it.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={it.color}
                  strokeWidth={hover === i ? stroke + 4 : stroke}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-acc}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  opacity={hover === null || hover === i ? 1 : 0.35}
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  className="donut-seg"
                />
              )
              acc += len
              return el
            })}
        </svg>
        <div className="donut-center">
          <span>{active ? active.label : total > 0 ? centerLabel : emptyText}</span>
          {total > 0 && <strong>{moneyCompact(active ? active.value : total, currency)}</strong>}
          {active && <em>{percent(active.value / total, 1)}</em>}
        </div>
      </div>
      {total > 0 && (
        <ul className="legend">
          {items.map((it, i) => (
            <li
              key={it.label}
              className={hover === i ? 'active' : ''}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <span className="dot" style={{ background: it.color }} />
              <span className="legend-label">{it.label}</span>
              <span className="legend-pct">{percent(it.value / total)}</span>
              <span className="legend-val">{money(it.value, currency, { decimals: 0 })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
