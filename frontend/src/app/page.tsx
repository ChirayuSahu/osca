export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Home</h1>
        <p className="text-slate-600">Welcome to the application</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Feature 1
          </h2>
          <p className="text-sm text-slate-600">
            This is a placeholder for your first feature.
          </p>
        </div>

        <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Feature 2
          </h2>
          <p className="text-sm text-slate-600">
            This is a placeholder for your second feature.
          </p>
        </div>

        <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Feature 3
          </h2>
          <p className="text-sm text-slate-600">
            This is a placeholder for your third feature.
          </p>
        </div>
      </div>
    </div>
  );
}