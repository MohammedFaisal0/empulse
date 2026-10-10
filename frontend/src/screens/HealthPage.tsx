import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { fetchHealth } from '../api/health'
import { Card } from '../components/ui'
import { en } from '../i18n/en'

export function HealthPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <h1 className="text-lg font-semibold text-ink">{en.health.title}</h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">
          {en.health.label}
        </p>
        <div className="mt-4 font-mono text-sm">
          {isLoading && <p className="text-muted">{en.health.checking}</p>}
          {isError && (
            <p className="text-coral">
              {error instanceof Error ? error.message : 'Request failed'}
            </p>
          )}
          {data && (
            <p>
              status:{' '}
              <span className="font-semibold text-teal">{data.status}</span>
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-muted">
          <Link className="text-teal-dark underline" to="/design-preview">
            Open design preview
          </Link>
        </p>
      </Card>
    </main>
  )
}
