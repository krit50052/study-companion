export function StreakCounter({ current, longest }: { current: number; longest: number }) {
  return (
    <div className="flex gap-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Current streak</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {current} day{current === 1 ? '' : 's'}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Longest streak</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {longest} day{longest === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  )
}
