

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col justify-center items-center h-24">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      {message && (
        <span className="mt-2 text-gray-700 text-sm">{message}</span>
      )}
    </div>
  );
}