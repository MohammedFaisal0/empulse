export type DriverBarRow = {
  id: string
  label: string
  ptsLabel: string
  note?: string
  widthPct: number
  muted?: boolean
}

type DriverBarsProps = {
  rows: DriverBarRow[]
  footerLabel?: string
  footerValue?: string
}

/** Stacked root-cause / signal bars shared by M06 and twin profiles (H03b). */
export function DriverBars({ rows, footerLabel, footerValue }: DriverBarsProps) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-ink">{row.label}</span>
            <span
              className={[
                'ltr-nums font-mono text-[12.5px]',
                row.muted ? 'text-muted' : 'text-coral-dark',
              ].join(' ')}
            >
              {row.ptsLabel}
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded bg-surface-2">
            <div
              className={['h-full rounded', row.muted ? 'bg-faint' : 'bg-coral'].join(
                ' ',
              )}
              style={{ width: `${Math.max(6, Math.min(100, row.widthPct))}%` }}
            />
          </div>
          {row.note ? (
            <p className="mt-1 text-[11.5px] text-muted">{row.note}</p>
          ) : null}
        </div>
      ))}
      {footerLabel && footerValue ? (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-[13px] font-semibold">{footerLabel}</span>
          <span className="ltr-nums text-xl font-bold text-coral-dark">
            {footerValue}
          </span>
        </div>
      ) : null}
    </div>
  )
}
