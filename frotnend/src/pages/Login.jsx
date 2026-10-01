import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import FormField from "../components/FromField";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.username.trim(), form.password);
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Login failed. Check your username and password.");
    } finally {
      setSubmitting(false);
    }
  };
 
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to your account"
      subtitle="Enter your username and password to continue."  
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={onChange}
          placeholder="••••••••"
          autoComplete="current-password"
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
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-500">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-indigo-900 hover:text-mango-600">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}