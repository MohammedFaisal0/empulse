import type { ReactNode } from 'react'

export type TabItem = {
  id: string
  label: string
}

type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ items, value, onChange, className = '' }: TabsProps) {
  return (
    <div
      role="tablist"
      className={[
        'flex gap-1 border-b border-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={[
              '-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
              active
                ? 'border-teal text-ink'
                : 'border-transparent text-muted hover:text-ink',
            ].join(' ')}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

type TabPanelProps = {
  children: ReactNode
  className?: string
}

export function TabPanel({ children, className = '' }: TabPanelProps) {
  return <div className={['pt-4', className].filter(Boolean).join(' ')}>{children}</div>
}
