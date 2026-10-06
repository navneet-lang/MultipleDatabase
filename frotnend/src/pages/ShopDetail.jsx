import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getShop, getShopProducts } from "../api/shops";

export default function ShopDetail() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getShop(id), getShopProducts(id)])
      .then(([s, p]) => {
        setShop(s.data);
        setProducts(p.data.results || p.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-8 text-slate-500">Loading...</p>;
  if (!shop) return <p className="p-8 text-slate-500">Shop nahi mili.</p>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Link to="/my-shops" className="text-sm text-indigo-700 hover:underline">← My Shops</Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-900">{shop.name}</h1>
          <p className="text-slate-500">{products.length} products</p>
        </div>
        <Link
          to={`/add-product?shop=${shop.id}`}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-800"
        >
          + Add Product
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p) => (
          <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200">
            <h2 className="font-bold text-slate-800">{p.name}</h2>
            <p className="text-indigo-600 font-extrabold">₹{p.price}</p>
            <p className="text-xs text-slate-400">{p.stock} in stock</p>
          </div>
        ))}
      </div>
    </div>
  );
}