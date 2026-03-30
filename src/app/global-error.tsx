"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="text-center space-y-4 px-4">
          <h1 className="text-7xl font-bold tracking-tighter text-red-600">Error</h1>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
