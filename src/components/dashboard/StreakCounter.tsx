export function StreakCounter({ current, longest }: { current: number; longest: number }) {
  return (
    <div className="flex gap-8 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <p className="text-sm text-gray-500">Current streak</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">
          {current} day{current === 1 ? '' : 's'}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Longest streak</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">
          {longest} day{longest === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
