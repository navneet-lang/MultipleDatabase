import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { uploadProductImage } from "../api/products";
import { getMyShops } from "../api/shops";

export default function AddProduct() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const shopFromUrl = params.get("shop");

  const [loading, setLoading] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shops, setShops] = useState([]);
  const [error, setError] = useState("");
  const [image, setImage] = useState(null);
  const [createdProductId, setCreatedProductId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    shop_id: shopFromUrl || "",
  });

  useEffect(() => {
    let active = true;

    getMyShops()
      .then((response) => {
        if (!active) return;
        const availableShops = response.data.results || response.data || [];
        setShops(availableShops);
        setFormData((current) => ({
          ...current,
          shop_id: availableShops.some((shop) => String(shop.id) === String(shopFromUrl))
            ? String(shopFromUrl)
            : "",
        }));
      })
      .catch((err) => {
        console.error("Seller shops load error:", err);
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Aapki shops load nahi ho payi. Page refresh karke dobara try karein."
          );
        }
      })
      .finally(() => {
        if (active) setShopsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shopFromUrl]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !createdProductId &&
      !shops.some((shop) => String(shop.id) === String(formData.shop_id))
    ) {
      setError("Product add karne ke liye apni shop select karein.");
      return;
    }

    setLoading(true);

    try {
      if (createdProductId) {
        if (!image) {
          setError("Product ban chuka hai. Image upload karne ke liye image select karein.");
          return;
        }
        await uploadProductImage(createdProductId, image);
        navigate(`/shops/${formData.shop_id}`);
        return;
      }

      const payload = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        shop_id: Number(formData.shop_id),
        extra_fields: {},
      };

      const response = await api.post("/products/", payload);
      setCreatedProductId(response.data.id);
      if (image) {
        try {
          await uploadProductImage(response.data.id, image);
        } catch (uploadError) {
          const uploadData = uploadError.response?.data;
          setError(
            `Product save ho gaya, lekin image upload nahi hui. ${
              uploadData?.detail || "Image dobara select karke Retry karein."
            }`
          );
          return;
        }
      }
      navigate(`/shops/${formData.shop_id}`);
    } catch (err) {
      console.error("Product add error:", err);
      const data = err.response?.data;
      setError(
        data?.detail ||
          (data ? JSON.stringify(data) : "Product add karne mein dikkat aayi.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-md border border-slate-200 p-8">
        <h1 className="text-2xl font-extrabold text-indigo-900 mb-2 text-center">
          Add New Product
        </h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Product sirf aapki apni shop mein add ho sakta hai.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-md text-sm break-words">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="product-shop"
              className="block text-sm font-semibold text-slate-700 mb-1"
            >
              Your shop
            </label>
            <select
              id="product-shop"
              name="shop_id"
              required
              value={formData.shop_id}
              onChange={handleChange}
              disabled={shopsLoading || shops.length === 0 || Boolean(createdProductId)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 focus:outline-none focus:border-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {shopsLoading
                  ? "Loading your shops..."
                  : shops.length
                    ? "Select your shop"
                    : "No active shops found"}
              </option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} — {shop.address}
                </option>
              ))}
            </select>
            {!shopsLoading && shops.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Pehle apni shop banayein, phir usmein product add karein.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Product Name
            </label>
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
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Description
            </label>
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
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Price (₹)
              </label>
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
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Stock
              </label>
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
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Category
            </label>
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

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Product image (optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-900 hover:file:bg-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-500">JPG, PNG ya WEBP · maximum 2 MB</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-indigo-900 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 transition disabled:opacity-50"
          >
            {loading
              ? createdProductId
                ? "Uploading image..."
                : "Adding..."
              : createdProductId
                ? "Retry image upload"
                : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
}