interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
      {/* Error icon */}
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <h3 className="mb-1 text-sm font-semibold text-gray-900">Error</h3>
      <p className="mb-4 text-sm text-gray-500">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
        >
          Retry
        </button>
      )}
    </div>
  );
}
