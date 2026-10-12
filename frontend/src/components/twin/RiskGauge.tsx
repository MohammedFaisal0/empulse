type RiskGaugeProps = {
  riskPct: number
  agoPct: number
  projectedPct: number
  labels: {
    low: string
    watch: string
    elevated: string
    critical: string
    weeksAgo: string
    now: string
    inThreeWeeks: string
  }
}

const H = 180
/** Minimum vertical gap between marker label centers (px). */
const MIN_GAP = 16

function yFor(pct: number): number {
  return H - (Math.max(0, Math.min(100, pct)) / 100) * H
}

/**
 * Spread marker Y positions so labels never overlap while staying close to
 * their true risk values (priority: Now > In 3 wks > weeks ago).
 */
function separateYs(raw: number[]): number[] {
  const order = [0, 1, 2] // ago, now, proj — we'll sort by y then nudge
  const items = raw.map((y, i) => ({ y, i }))
  items.sort((a, b) => a.y - b.y)
  for (let n = 0; n < 8; n++) {
    for (let k = 1; k < items.length; k++) {
      if (items[k].y - items[k - 1].y < MIN_GAP) {
        const mid = (items[k].y + items[k - 1].y) / 2
        items[k - 1].y = mid - MIN_GAP / 2
        items[k].y = mid + MIN_GAP / 2
      }
    }
  }
  // Clamp into gauge band with padding for label height
  for (const it of items) {
    it.y = Math.max(8, Math.min(H - 8, it.y))
  }
  // Second pass after clamp
  items.sort((a, b) => a.y - b.y)
  for (let k = 1; k < items.length; k++) {
    if (items[k].y - items[k - 1].y < MIN_GAP) {
      items[k].y = Math.min(H - 8, items[k - 1].y + MIN_GAP)
    }
  }
  const out = [...raw]
  for (const it of items) out[it.i] = it.y
  void order
  return out
}

/** Vertical burnout risk gauge (M06 column 1). Bands: high≥60 / watch 45–59 / healthy&lt;45. */
export function RiskGauge({
  riskPct,
  agoPct,
  projectedPct,
  labels,
}: RiskGaugeProps) {
  const nowY = yFor(riskPct)
  const agoY = yFor(agoPct)
  const projY = yFor(projectedPct)
  const fillH = H - nowY
  const [agoLabelY, nowLabelY, projLabelY] = separateYs([agoY, nowY, projY])

  return (
    <div className="relative mt-4 flex gap-2" dir="ltr" style={{ height: H + 8 }}>
      <div className="relative w-11 shrink-0 font-mono text-[8.5px] uppercase leading-none text-muted">
        <span className="absolute end-1" style={{ top: yFor(90), transform: 'translateY(-50%)' }}>
          {labels.critical}
        </span>
        <span className="absolute end-1" style={{ top: yFor(70), transform: 'translateY(-50%)' }}>
          {labels.elevated}
        </span>
        <span className="absolute end-1" style={{ top: yFor(52), transform: 'translateY(-50%)' }}>
          {labels.watch}
        </span>
        <span className="absolute end-1" style={{ top: yFor(12), transform: 'translateY(-50%)' }}>
          {labels.low}
        </span>
      </div>
      <div className="relative w-7 shrink-0">
        {/* Band backgrounds (bottom → top): healthy / watch / elevated / critical */}
        <div className="absolute inset-x-0 bottom-0 top-0 overflow-hidden rounded-[5px]">
          <div
            className="absolute inset-x-0 bottom-0 bg-teal opacity-20"
            style={{ height: '45%' }}
          />
          <div
            className="absolute inset-x-0 bg-amber opacity-20"
            style={{ bottom: '45%', height: '15%' }}
          />
          <div
            className="absolute inset-x-0 bg-coral opacity-20"
            style={{ bottom: '60%', height: '20%' }}
          />
          <div
            className="absolute inset-x-0 top-0 bg-coral-dark opacity-20"
            style={{ height: '20%' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-[5px] bg-coral opacity-80"
            style={{ height: fillH }}
          />
        </div>
        {/* Tick marks at true risk positions */}
        <span
          className="absolute start-0 end-0 border-t border-faint"
          style={{ top: agoY }}
        />
        <span
          className="absolute start-0 end-0 border-t-2 border-coral-dark"
          style={{ top: nowY }}
        />
        <span
          className="absolute start-0 end-0 border-t border-coral"
          style={{ top: projY }}
        />
      </div>
      <div className="relative min-w-0 flex-1 text-[11px] leading-tight">
        <Marker y={agoLabelY} color="text-faint" line="border-faint" bold={false}>
          {labels.weeksAgo}
        </Marker>
        <Marker y={nowLabelY} color="text-coral-dark" line="border-coral-dark" bold>
          {labels.now}
        </Marker>
        <Marker y={projLabelY} color="text-coral-dark" line="border-coral" bold={false}>
          {labels.inThreeWeeks}
        </Marker>
      </div>
    </div>
  )
}

function Marker({
  y,
  color,
  line,
  bold,
  children,
}: {
  y: number
  color: string
  line: string
  bold: boolean
  children: string
}) {
  return (
    <div
      className="absolute start-0 flex max-w-full items-center gap-1"
      style={{ top: y, transform: 'translateY(-50%)' }}
    >
      <span className={`block w-3 shrink-0 border-t-2 ${line}`} />
      <span
        className={[
          'truncate',
          color,
          bold ? 'font-bold' : 'font-medium',
        ].join(' ')}
      >
        {children}
      </span>
    </div>
  )
}
