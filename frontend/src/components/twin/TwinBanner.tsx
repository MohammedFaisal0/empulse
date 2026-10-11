import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { RtlFlip } from '../RtlFlip'
import { Button } from '../ui'

type TwinBannerProps = {
  tierLabel: string
  alertLabel: string
  title: string
  subtitle: string
  startLabel: string
  rootCausesLabel: string
  onStart?: () => void
  rootCausesHref?: string
}

/** Gold + wellbeing alert strip used on M04b / H03b. */
export function TwinBanner({
  tierLabel,
  alertLabel,
  title,
  subtitle,
  startLabel,
  rootCausesLabel,
  onStart,
  rootCausesHref = '#why',
}: TwinBannerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-coral bg-coral-light px-4 py-3">
      <span className="inline-flex items-center rounded-[10px] border border-tier-gold/40 bg-tier-gold/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-tier-gold">
        {tierLabel}
      </span>
      <span className="inline-flex items-center rounded-[10px] bg-coral-light px-2.5 py-1 text-[11px] font-semibold text-coral-dark">
        {alertLabel}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink">{title}</p>
        <p className="text-[12.5px] text-muted">{subtitle}</p>
      </div>
      <Button
        variant="accent"
        className="!bg-coral-dark"
        type="button"
        onClick={onStart}
      >
        {startLabel}
      </Button>
      <Link
        to={rootCausesHref}
        className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-dark"
      >
        {rootCausesLabel}
        <RtlFlip>
          <ArrowRight className="h-3.5 w-3.5" />
        </RtlFlip>
      </Link>
    </div>
  )
}
