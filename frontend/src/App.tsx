import { useQuery } from '@tanstack/react-query'

import { fetchHealth } from './api/health'

function App() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-sans text-lg font-semibold text-slate-900">
          EMPULSE
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-slate-500">
          API health
        </p>
        <div className="mt-4 font-mono text-sm">
          {isLoading && <p className="text-slate-500">Checking…</p>}
          {isError && (
            <p className="text-red-600">
              {error instanceof Error ? error.message : 'Request failed'}
            </p>
          )}
          {data && (
            <p>
              status:{' '}
              <span className="font-semibold text-teal-600">{data.status}</span>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
