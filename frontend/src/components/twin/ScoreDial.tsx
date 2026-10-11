import type { Tier } from '../ui'
import { Medallion } from '../ui'

type ScoreDialProps = {
  score: number
  tier: Tier
  empulseLabel: string
  alertBadge?: string
  exceptionalLabel: string
  line1: string
  line2: string
  opportunity: string
}

/** Navy score dial card (M04b / H03b Who section). */
export function ScoreDial({
  score,
  tier,
  empulseLabel,
  alertBadge,
  exceptionalLabel,
  line1,
  line2,
  opportunity,
}: ScoreDialProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-navy p-5 text-white">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] tracking-wide text-slate-400">
          {empulseLabel}
        </p>
        {alertBadge ? (
          <span className="rounded-md bg-coral-light px-2 py-0.5 text-[11px] font-semibold text-coral-dark">
            {alertBadge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center py-2">
        <div className="relative flex h-[130px] w-[130px] items-center justify-center rounded-full border-8 border-navy2 bg-navy">
          <span className="ltr-nums text-[44px] font-bold leading-none">{score}</span>
        </div>
        <div className="mt-3">
          <Medallion score={score} tier={tier} size="sm" className="!border-2" />
        </div>
        <p className="mt-2 text-center text-[11.5px] text-teal">
          {exceptionalLabel}
        </p>
      </div>
      <p className="text-center text-xs text-faint">{line1}</p>
      <p className="text-center text-xs text-faint">{line2}</p>
      <p className="mt-3 text-[11.5px] text-teal">{opportunity}</p>
    </div>
  )
}
