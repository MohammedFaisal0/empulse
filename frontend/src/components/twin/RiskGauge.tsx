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

function yFor(pct: number): number {
  return H - (Math.max(0, Math.min(100, pct)) / 100) * H
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
      </div>
      <div className="relative flex-1 text-[12px]">
        <Marker y={agoY} color="text-faint" line="border-faint" bold={false}>
          {labels.weeksAgo}
        </Marker>
        <Marker y={nowY} color="text-coral-dark" line="border-coral-dark" bold>
          {labels.now}
        </Marker>
        <Marker y={projY} color="text-coral-dark" line="border-coral" bold={false}>
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
      className="absolute start-0 flex items-center gap-1.5"
      style={{ top: y, transform: 'translateY(-50%)' }}
    >
      <span className={`block w-4 border-t-2 ${line}`} />
      <span className={[color, bold ? 'font-bold' : 'font-medium'].join(' ')}>
        {children}
      </span>
    </div>
  )
}
