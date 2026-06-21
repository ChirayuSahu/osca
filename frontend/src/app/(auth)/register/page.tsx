export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Register</h1>
        <p className="text-slate-600">Create a new account</p>
      </div>

      <div className="p-6 border border-slate-200 rounded-lg bg-white shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <button className="w-full px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-700 transition-colors">
          Sign Up
        </button>
      </div>
    </div>
  );
}
