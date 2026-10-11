import { colors } from '../../theme/colors'

type MiniSparklineProps = {
  values: number[]
  width?: number
  height?: number
  stroke?: string
  className?: string
}

/** Compact SVG sparkline from a numeric series (LTR path; keep charts LTR). */
export function MiniSparkline({
  values,
  width = 88,
  height = 20,
  stroke = colors.coral,
  className = '',
}: MiniSparklineProps) {
  if (values.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden
        dir="ltr"
      />
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width
      const y = height - ((v - min) / span) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')
  const last = values[values.length - 1]!
  const lastX = width
  const lastY = height - ((last - min) / span) * (height - 4) - 2

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-hidden
      dir="ltr"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
      <circle cx={lastX} cy={lastY} r={2} fill={stroke} />
    </svg>
  )
}
