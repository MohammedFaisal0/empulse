import type { ReactNode } from 'react'

type Column<T> = {
  key: string
  header: string
  mono?: boolean
  render: (row: T) => ReactNode
}

type TableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  className?: string
}

export function Table<T>({ columns, rows, rowKey, className = '' }: TableProps<T>) {
  return (
    <div
      className={[
        'overflow-hidden rounded-lg border border-border bg-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-surface-4">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    'px-3 py-2.5 text-ink',
                    col.mono ? 'font-mono text-xs' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
