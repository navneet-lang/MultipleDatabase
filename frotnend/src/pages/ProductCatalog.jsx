import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { addToCart } from "../api/cart";

export default function ProductCatalog() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    api
      .get("/products/")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setProducts(data);
      })
      .catch((err) => console.error("Products fetch karne mein error:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (productId) => {
    setAddingId(productId);
    try {
      await addToCart(productId, 1);
      alert("Cart mein add ho gaya!");
    } catch (err) {
      alert(err.response?.data?.detail || "Cart mein add nahi ho paya.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-indigo-900">Our Products</h1>
        <button
          onClick={() => navigate("/cart")}
          className="bg-indigo-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-800 transition"
        >
          🛒 Go to Cart
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-500 font-medium">Loading products...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="h-48 bg-slate-100 rounded-md mb-4 flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-400 text-sm">No Image</span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-800 line-clamp-1">
                  {product.name}
                </h2>
                <p className="text-indigo-600 font-extrabold mt-1 text-xl">
                  ₹{product.price}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                </p>
              </div>

              <button
                onClick={() => handleAddToCart(product.id)}
                disabled={product.stock === 0 || addingId === product.id}
                className="mt-4 w-full bg-indigo-900 text-white py-2 rounded-lg font-medium hover:bg-indigo-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingId === product.id ? "Adding..." : product.stock === 0 ? "Out of Stock" : "Add to Cart"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center mt-10">
          <p className="text-slate-500 text-lg">Koi products nahi mile.</p>
        </div>
      )}
    </div>
  );
}