'use client'

import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm9-6a1 1 0 110 2h-1a1 1 0 110-2h1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm14.24 6.24a1 1 0 001.42-1.42l-.71-.7a1 1 0 10-1.42 1.41l.71.71zM6.47 6.47a1 1 0 001.41-1.41l-.7-.71a1 1 0 00-1.42 1.42l.71.7zm11.06-1.41a1 1 0 10-1.41-1.42l-.71.71a1 1 0 101.42 1.41l.7-.7zM7.17 17.83a1 1 0 10-1.42 1.41l.71.71a1 1 0 001.41-1.42l-.7-.7zM12 20a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M21.64 13a1 1 0 00-1.05-.14 8 8 0 01-10.45-10.45 1 1 0 00-1.19-1.34A10 10 0 1022.98 14.05 1 1 0 0021.64 13z" />
        </svg>
      )}
    </button>
  )
}
