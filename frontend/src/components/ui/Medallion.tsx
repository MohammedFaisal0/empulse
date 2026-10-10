import { useTranslation } from 'react-i18next'

export type Tier = 'gold' | 'silver' | 'bronze' | 'growth'

const tierRing: Record<Tier, string> = {
  gold: 'border-tier-gold text-tier-gold',
  silver: 'border-tier-silver text-tier-silver',
  bronze: 'border-tier-bronze text-tier-bronze',
  growth: 'border-tier-growth text-tier-growth',
}

type MedallionProps = {
  score: number
  tier: Tier
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: 'h-14 w-14 text-lg',
  md: 'h-20 w-20 text-2xl',
  lg: 'h-28 w-28 text-[28px]',
} as const

export function Medallion({
  score,
  tier,
  size = 'md',
  className = '',
}: MedallionProps) {
  const { t } = useTranslation()
  const label = t(`tiers.${tier}`)

  return (
    <div
      className={[
        'inline-flex flex-col items-center justify-center rounded-full border-[3px] bg-white font-semibold',
        sizeClass[size],
        tierRing[tier],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${label} ${score}`}
    >
      <span className="ltr-nums font-mono leading-none text-ink">{score}</span>
      <span className="mt-0.5 font-mono text-[9px] font-medium uppercase tracking-wide">
        {label}
      </span>
    </div>
  )
}
