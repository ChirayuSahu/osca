export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-slate-200 bg-white">
      <div className="flex items-center justify-center h-full px-6">
        <p className="text-sm text-slate-600">
          © {new Date().getFullYear()} Your Company. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
