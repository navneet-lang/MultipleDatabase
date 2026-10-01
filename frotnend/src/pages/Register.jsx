import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FromField";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "user", label: "I'm here to buy", hint: "Browse shops and order" },
  { value: "seller", label: "I'm here to sell", hint: "Open your own shop" },
];

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ ...form, username: form.username.trim() });
      await login(form.username.trim(), form.password);
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Takes less than a minute."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => setForm({ ...form, role: r.value })}
              className={`text-left rounded-lg border px-3.5 py-3 transition
                ${
                  form.role === r.value
                    ? "border-mango-500 bg-mango-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
            >
              <span className="block text-sm font-semibold text-indigo-900">{r.label}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{r.hint}</span>
            </button>
          ))}
        </div>

        <FormField
          label="Username"
          name="username"
          value={form.username}
          onChange={onChange}
          placeholder="navneet"
          autoComplete="username"
          required
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-900 py-2.5 text-sm font-semibold text-cream
            transition hover:bg-indigo-800 disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-indigo-900 hover:text-mango-600">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}