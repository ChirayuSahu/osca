export function Spinner() {
  return (
    <span
      role="status"
      className="inline-flex h-6 w-6 animate-spin rounded-full border-4 border-slate-300 border-t-transparent text-slate-900"
      aria-label="Loading"
    />
  );
}
