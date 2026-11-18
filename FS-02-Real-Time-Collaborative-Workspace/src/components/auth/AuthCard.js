export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-7 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      {children}

      {footer && (
        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          {footer}
        </div>
      )}
    </div>
  );
}