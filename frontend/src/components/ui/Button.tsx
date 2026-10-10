import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'accent'

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-navy text-white shadow-primaryButton hover:bg-navy2 focus-visible:ring-navy',
  secondary:
    'border border-border bg-white text-ink hover:bg-surface-4 focus-visible:ring-navy',
  accent:
    'bg-coral text-white hover:bg-coral-dark focus-visible:ring-coral',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3.5 text-[13px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
