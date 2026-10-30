

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col justify-center items-center h-24">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-primary"></div>
      {message && (
        <span className="mt-2 text-muted-foreground text-sm">{message}</span>
      )}
    </div>
  );
}