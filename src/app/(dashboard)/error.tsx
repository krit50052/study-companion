'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-gray-900">
        Something went wrong
      </h1>
      <p className="text-sm text-gray-500">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Try again
      </button>
    </div>
  )
}
