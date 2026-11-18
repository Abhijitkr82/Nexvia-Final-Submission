
export default function Button({
  children,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  block = false,
  className = "",
  ...props
}) {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        variants[variant]
      } ${block ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
