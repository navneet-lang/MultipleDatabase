import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createShop } from "../api/shops";

export default function CreateShop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    gst_number: "",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createShop(form);
      navigate(`/shops/${res.data.id}`);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || (data ? JSON.stringify(data) : "Shop create nahi ho payi."));
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500";
  const label = "block text-sm font-semibold text-slate-700 mb-1";

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center py-10 px-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-md border border-slate-200 p-8">
        <h1 className="text-2xl font-extrabold text-indigo-900 mb-6 text-center">
          Create New Shop
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm break-words">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={label}>Shop Name</label>
            <input name="name" required value={form.name} onChange={handleChange}
              className={input} placeholder="e.g. Sumit Electronics" />
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea name="description" rows="3" value={form.description}
              onChange={handleChange} className={input} placeholder="Mobile aur accessories" />
          </div>
          <div>
            <label className={label}>Address</label>
            <input name="address" required value={form.address} onChange={handleChange}
              className={input} placeholder="Ghaziabad, UP" />
          </div>
          <div>
            <label className={label}>GST Number (optional)</label>
            <input name="gst_number" value={form.gst_number} onChange={handleChange}
              className={input} placeholder="09ABCDE1234F1Z9" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full mt-2 bg-indigo-900 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 transition disabled:opacity-50">
            {loading ? "Creating..." : "Create Shop"}
          </button>
        </form>
      </div>
    </div>
  );
}