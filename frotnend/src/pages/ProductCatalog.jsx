import { useEffect, useState } from "react";
import api from "../api/axios";
import { addToCart, getCart } from "../api/cart";

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [inCart, setInCart] = useState({}); // { productId: quantity }
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [p, c] = await Promise.all([
          api.get("/products/"),
          getCart().catch(() => ({ data: { items: [] } })),
        ]);

        const data = Array.isArray(p.data) ? p.data : p.data.results || [];
        setProducts(data);

        const map = {};
        (c.data.items || []).forEach((item) => {
          map[String(item.product_id)] = item.quantity;
        });
        setInCart(map);
      } catch (err) {
        console.error("Products load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const remainingOf = (product) =>
    Math.max(0, product.stock - (inCart[String(product.id)] || 0));

  const handleAddToCart = async (product) => {
    if (remainingOf(product) < 1) return;
    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      setInCart((prev) => ({
        ...prev,
        [String(product.id)]: (prev[String(product.id)] || 0) + 1,
      }));
    } catch (err) {
      alert(err.response?.data?.detail || "Cart mein add nahi ho paya.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-extrabold text-indigo-900 mb-6">
        Our Products
      </h1>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-500 font-medium">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center mt-10">
          <p className="text-slate-500 text-lg">Koi products nahi mile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const remaining = remainingOf(product);
            const mine = inCart[String(product.id)] || 0;
            const soldOut = remaining === 0;

            return (
              <div
                key={product.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"
              >
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

                <p
                  className={`text-xs mt-1 ${
                    soldOut
                      ? "text-red-500 font-semibold"
                      : remaining <= 5
                      ? "text-orange-500 font-semibold"
                      : "text-slate-400"
                  }`}
                >
                  {soldOut
                    ? mine > 0
                      ? "Poora stock tere cart mein hai"
                      : "Out of stock"
                    : remaining <= 5
                    ? `Sirf ${remaining} bache hain!`
                    : `${remaining} in stock`}
                </p>

                {mine > 0 && (
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Cart mein: {mine}
                  </p>
                )}

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={soldOut || addingId === product.id}
                  className="mt-auto w-full bg-indigo-900 text-white py-2 rounded-lg font-medium hover:bg-indigo-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingId === product.id
                    ? "Adding..."
                    : soldOut
                    ? "Out of Stock"
                    : "Add to Cart"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}