export default function FormField({ label, error, ...inputProps }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...inputProps}
        className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800
          placeholder:text-slate-400 outline-none transition
          focus:ring-2 focus:ring-mango-500/40 focus:border-mango-500
          ${error ? "border-red-400" : "border-slate-200"}`}
      />
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}