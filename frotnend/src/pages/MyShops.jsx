import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyShops } from "../api/shops";

export default function MyShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyShops()
      .then((res) => setShops(res.data.results || res.data || []))
      .catch((err) => console.error("Shops load error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8 text-slate-500">Loading shops...</p>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-indigo-900 mb-1">My Shops</h1>
          <p className="text-slate-500">Total shops: {shops.length}</p>
        </div>
        <button
          onClick={() => navigate("/create-shop")}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-800"
        >
          + Create Shop
        </button>
      </div>

      {shops.length === 0 ? (
        <p className="text-slate-500">Abhi koi shop nahi hai.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <button
              key={shop.id}
              onClick={() => navigate(`/shops/${shop.id}`)}
              className="text-left bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 transition"
            >
              <h2 className="text-lg font-bold text-slate-800">{shop.name}</h2>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                {shop.description}
              </p>
              <p className="text-xs text-slate-400 mt-1">{shop.address}</p>
              <p className="text-xs text-indigo-700 mt-3 font-medium">Open shop →</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}