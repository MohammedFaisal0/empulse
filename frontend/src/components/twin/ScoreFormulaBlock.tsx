export type ScoreSignalRow = {
  id: string
  label: string
  sublabel?: string
  weight: string
  score: number
  baseline: number
  change: number
  /** When true, value is not from API — design placeholder. */
  todo?: boolean
  tone?: 'teal' | 'amber' | 'coral' | 'muted'
}

type ScoreFormulaBlockProps = {
  caption: string
  headers: {
    signal: string
    weight: string
    score: string
    baseline: string
    change: string
  }
  rows: ScoreSignalRow[]
  footnote?: string
  totalLabel: string
  totalScore: number
  tierBannerTitle: string
  tierBannerSub: string
}

function barTone(tone: ScoreSignalRow['tone']): string {
  if (tone === 'coral') return 'bg-coral'
  if (tone === 'amber') return 'bg-amber'
  if (tone === 'muted') return 'bg-faint'
  return 'bg-teal-dark'
}

function scoreTone(tone: ScoreSignalRow['tone']): string {
  if (tone === 'coral') return 'text-coral'
  if (tone === 'amber') return 'text-amber'
  return 'text-ink'
}

/** Weighted score table (M04b / H03b Why · How was it calculated?). */
export function ScoreFormulaBlock({
  caption,
  headers,
  rows,
  footnote,
  totalLabel,
  totalScore,
  tierBannerTitle,
  tierBannerSub,
}: ScoreFormulaBlockProps) {
  return (
    <div className="rounded-[14px] border border-border bg-white p-4 shadow-card">
      <p className="font-mono text-[10px] tracking-wide text-faint">{caption}</p>
      <div className="mt-2 grid grid-cols-[1fr_48px_40px_52px_44px_72px] gap-1 font-mono text-[10px] uppercase tracking-wide text-muted">
        <span>{headers.signal}</span>
        <span>{headers.weight}</span>
        <span>{headers.score}</span>
        <span>{headers.baseline}</span>
        <span>{headers.change}</span>
        <span />
      </div>
      <div className="mt-1 border-t border-border">
        {rows.map((row) => {
          const changeStr =
            row.change > 0 ? `+${row.change}` : String(row.change)
          const changeColor =
            row.change < 0 ? 'text-coral-dark' : 'text-teal-dark'
          return (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_48px_40px_52px_44px_72px] items-center gap-1 border-b border-surface-2 py-2.5"
              title={row.todo ? 'TODO: design placeholder — not in API' : undefined}
            >
              <div>
                <p className="text-[13px] text-ink">
                  {row.label}
                  {row.todo ? (
                    <span className="ms-1 font-mono text-[9px] text-faint">TODO</span>
                  ) : null}
                </p>
                {row.sublabel ? (
                  <p className="text-[11.5px] text-muted">{row.sublabel}</p>
                ) : null}
              </div>
              <span className="ltr-nums font-mono text-xs text-muted">
                {row.weight}
              </span>
              <span
                className={[
                  'ltr-nums font-mono text-xs',
                  scoreTone(row.tone),
                ].join(' ')}
              >
                {Math.round(row.score)}
              </span>
              <span className="ltr-nums font-mono text-xs text-muted">
                {Math.round(row.baseline)}
              </span>
              <span className={['ltr-nums font-mono text-xs', changeColor].join(' ')}>
                {changeStr}
              </span>
              <div className="h-2 overflow-hidden rounded bg-surface-2">
                <div
                  className={['h-full rounded', barTone(row.tone)].join(' ')}
                  style={{ width: `${Math.min(100, row.score)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {footnote ? (
        <div className="mt-3 rounded-lg bg-coral-light px-3 py-2 text-[11.5px] leading-snug text-coral-dark">
          {footnote}
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
        <span className="text-sm font-bold text-ink">{totalLabel}</span>
        <span className="ltr-nums font-mono text-sm">{totalScore}</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-teal-dark"
            style={{ width: `${Math.min(100, totalScore)}%` }}
          />
        </div>
      </div>
      <div className="mt-3 rounded-[10px] bg-tier-gold/15 px-3 py-2.5">
        <p className="text-[13px] font-bold text-tier-gold">{tierBannerTitle}</p>
        <p className="text-xs text-tier-gold">{tierBannerSub}</p>
      </div>
    </div>
  )
}
