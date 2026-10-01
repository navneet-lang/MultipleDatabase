const CATEGORIES = ["Momos & food", "Electronics", "Plumbing parts", "Fashion", "Home decor"];

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-cream">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-indigo-900 text-cream px-14 py-12 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-mango-500/20"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-10 -left-16 w-56 h-56 rounded-full bg-indigo-800/60"
          aria-hidden="true"
        />

        <div className="relative">
          <span className="font-display font-bold text-xl tracking-tight">Bazaario</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display font-extrabold text-4xl leading-tight">
            Every seller, every shop, one marketplace.
          </h1>
          <p className="mt-5 text-indigo-100/80 text-base leading-relaxed">
            Local sellers list their shop, customers browse, order and pay —
            all in one place, run entirely by you.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <span
                key={c}
                className="text-sm px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-cream"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-indigo-100/60">
          Built for sellers who want to be found, and buyers who want it simple.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-14 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 font-display font-bold text-xl text-indigo-900">
            Bazaario
          </div>
          {eyebrow && (
            <p className="text-mango-600 text-sm font-semibold mb-2">{eyebrow}</p>
          )}
          <h2 className="font-display font-bold text-2xl text-indigo-900">{title}</h2>
          {subtitle && <p className="mt-2 text-slate-500 text-sm">{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}  