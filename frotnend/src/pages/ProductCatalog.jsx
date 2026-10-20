import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { addToCart, getCart } from "../api/cart";
import { getCategories, getProducts } from "../api/products";

const LIMIT = 8;

export default function ProductCatalog() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inCart, setInCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch((err) => console.error("Categories load error:", err));

    getCart()
      .then((res) => {
        const cartItems = {};
        (res.data.items || []).forEach((item) => {
          cartItems[String(item.product_id)] = item.quantity;
        });
        setInCart(cartItems);
      })
      .catch((err) => console.error("Cart load error:", err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (q) params.q = q;
    if (category) params.category = category;
    if (minPrice !== "") params.price_min = minPrice;
    if (maxPrice !== "") params.price_max = maxPrice;

    getProducts(params)
      .then((res) => {
        setProducts(res.data.results || []);
        setTotalPages(res.data.total_pages || 0);
        setCount(res.data.count || 0);
      })
      .catch((err) => console.error("Products load error:", err))
      .finally(() => setLoading(false));
  }, [q, category, minPrice, maxPrice, page]);

  const remainingOf = (product) =>
    Math.max(0, product.stock - (inCart[String(product.id)] || 0));

  const handleAdd = async (p) => {
    if (remainingOf(p) < 1) return;
    setAddingId(p.id);
    try {
      await addToCart(p.id, 1);
      setInCart((prev) => ({ ...prev, [String(p.id)]: (prev[String(p.id)] || 0) + 1 }));
      window.dispatchEvent(new Event("cart:changed")); // navbar badge refresh
    } catch (err) {
      alert(err.response?.data?.detail || "Cart mein add nahi ho paya.");
    } finally {
      setAddingId(null);
    }
  };

  const pickCategory = (name) => {
    setCategory(name === category ? "" : name);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  };

  const hasFilters = search || category || minPrice !== "" || maxPrice !== "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search bar */}
      <div className="bg-indigo-900 px-8 py-6">
        <div className="max-w-3xl">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, foods, items..."
            className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-900">Our Products</h1>
          <p className="text-sm text-slate-500">{count} products</p>
        </div>

        <div className="flex flex-col-reverse lg:flex-row gap-8">
          {/* Product grid */}
          <div className="flex-1">
            {loading ? (
              <p className="text-slate-500">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="text-slate-500">Koi products nahi mile.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((p) => {
                  const remaining = remainingOf(p);
                  const mine = inCart[String(p.id)] || 0;
                  const soldOut = remaining === 0;
                  return (
                    <div
                      key={p.id}
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col"
                    >
                      <div className="h-44 bg-slate-100 rounded-md mb-4 flex items-center justify-center overflow-hidden">
                        {p.image_url && (
                          <Link to={`/products/${p.id}`} className="h-full w-full">
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="h-full w-full object-contain transition duration-300 hover:scale-105"
                            />
                          </Link>
                        )}
                        {!p.image_url && (
                          <span className="text-slate-400 text-sm">No image</span>
                        )}
                      </div>

                      <Link
                        to={`/products/${p.id}`}
                        className="text-lg font-bold text-slate-800 line-clamp-1 hover:text-indigo-700"
                      >
                        {p.name}
                      </Link>
                      {p.shop_name && (
                        <p className="text-xs text-slate-400">Sold by {p.shop_name}</p>
                      )}
                      <p className="text-indigo-600 font-extrabold mt-1 text-xl">₹{p.price}</p>

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
                        <p className="text-xs text-indigo-700">Cart mein: {mine}</p>
                      )}

                      <Link
                        to={`/products/${p.id}`}
                        className="mt-3 text-center text-sm font-semibold text-indigo-700 hover:underline"
                      >
                        View details & reviews
                      </Link>
                      <button
                        onClick={() => handleAdd(p)}
                        disabled={soldOut || addingId === p.id}
                        className="mt-3 w-full bg-indigo-900 text-white py-2 rounded-lg font-medium hover:bg-indigo-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingId === p.id ? "Adding..." : soldOut ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Filters sidebar */}
          <aside className="lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-5 h-fit">
            <h3 className="font-bold text-slate-900 mb-3">Category Filters</h3>
            <div className="space-y-2">
              {categories.length === 0 && (
                <p className="text-xs text-slate-400">Koi category nahi.</p>
              )}
              {categories.map((c) => (
                <label key={c.name} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.name}
                    onChange={() => pickCategory(c.name)}
                    onClick={() => category === c.name && pickCategory(c.name)}
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.count}</span>
                </label>
              ))}
            </div>

            <h3 className="font-bold text-slate-900 mt-6 mb-3">Price Range (₹)</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                placeholder="Min"
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
              />
              <span className="text-slate-400">–</span>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                placeholder="Max"
                className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-5 w-full text-sm text-indigo-700 font-medium hover:underline"
              >
                Clear all filters
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
