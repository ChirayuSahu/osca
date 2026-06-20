export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Metric 1</p>
          <p className="text-2xl font-bold text-slate-900">1,234</p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Metric 2</p>
          <p className="text-2xl font-bold text-slate-900">5,678</p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Metric 3</p>
          <p className="text-2xl font-bold text-slate-900">890</p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Metric 4</p>
          <p className="text-2xl font-bold text-slate-900">456</p>
        </div>
      </div>

      <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          <div className="py-2 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900">Activity Item 1</p>
            <p className="text-xs text-slate-600">2 hours ago</p>
          </div>
          <div className="py-2 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900">Activity Item 2</p>
            <p className="text-xs text-slate-600">4 hours ago</p>
          </div>
          <div className="py-2">
            <p className="text-sm font-medium text-slate-900">Activity Item 3</p>
            <p className="text-xs text-slate-600">1 day ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
