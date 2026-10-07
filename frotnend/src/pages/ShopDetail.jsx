import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyShops, getShop, getShopProducts } from "../api/shops";

export default function ShopDetail() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      // 1. Shop
      try {
        const res = await getShop(id);
        if (active) setShop(res.data);
      } catch (err) {
        console.error("getShop error:", err.response?.status, err.response?.data);
        // fallback: list mein se dhoondo
        try {
          const list = await getMyShops();
          const arr = list.data.results || list.data || [];
          const found = arr.find((s) => String(s.id) === String(id));
          if (active) {
            if (found) setShop(found);
            else setError(`Shop #${id} nahi mili (status ${err.response?.status || "network"}).`);
          }
        } catch {
          if (active) setError("Shop load nahi ho payi.");
        }
      }

      // 2. Products (fail ho to bhi shop dikhegi)
      try {
        const res = await getShopProducts(id);
        let arr = res.data.results || res.data || [];
        // agar backend filter ignore kare to yahan filter
        if (arr.length && arr[0].shop_id !== undefined) {
          arr = arr.filter((p) => String(p.shop_id) === String(id));
        }
        if (active) setProducts(arr);
      } catch (err) {
        console.error("products error:", err.response?.status, err.response?.data);
      }

      if (active) setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="p-8 text-slate-500">Loading...</p>;
  if (!shop) return <p className="p-8 text-red-500">{error || "Shop nahi mili."}</p>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Link to="/my-shops" className="text-sm text-indigo-700 hover:underline">
        ← My Shops
      </Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-900">{shop.name}</h1>
          <p className="text-slate-500">
            {shop.address} · {products.length} products
          </p>
        </div>
        <Link
          to={`/add-product?shop=${shop.id}`}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-800"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-500">Is shop mein abhi koi product nahi hai.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200">
              <h2 className="font-bold text-slate-800">{p.name}</h2>
              <p className="text-indigo-600 font-extrabold">₹{p.price}</p>
              <p className="text-xs text-slate-400">{p.stock} in stock</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}