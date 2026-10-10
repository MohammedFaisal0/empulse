type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

const sizeClass = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
} as const

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      aria-label={name}
      title={name}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full bg-navy2 font-mono font-medium text-white',
        sizeClass[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {initialsFromName(name)}
    </span>
  )
}
