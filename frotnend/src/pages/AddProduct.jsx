import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Aapke data structure ke hisaab se state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    shop_id: 16, // Postman data mein shop_id 16 tha, isliye default 16 rakha hai
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Backend ko number format chahiye price aur stock ke liye
      const payload = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        shop_id: Number(formData.shop_id),
        extra_fields: {} // Abhi ke liye empty bhej rahe hain
      };

      // Product Create karne ki API (Agar endpoint '/product/CreatItem' hai toh change kar lena)
      await api.post("/products/", payload); 
      
      alert("Product successfully add ho gaya!");
      navigate("/products"); // Add hone ke baad seedha products list par bhej dega

    } catch (err) {
      console.error("Product add error:", err);
      setError("Product add karne mein dikkat aayi. Network tab check karein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-md border border-slate-200 p-8">
        <h1 className="text-2xl font-extrabold text-indigo-900 mb-6 text-center">
          Add New Product
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Veg & Paneer Momo"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
              placeholder="Best steamed momos..."
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Price (₹)</label>
              <input
                type="number"
                name="price"
                required
                value={formData.price}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                placeholder="85"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Stock</label>
              <input
                type="number"
                name="stock"
                required
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                placeholder="120"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
            <input
              type="text"
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
              placeholder="steamed and fried"
            />
          </div>

          <button
            type="submit"       
            disabled={loading}
            className="w-full mt-6 bg-indigo-900 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 transition disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
}

