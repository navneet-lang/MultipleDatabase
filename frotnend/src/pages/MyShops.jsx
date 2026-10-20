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
              className="overflow-hidden text-left bg-white rounded-xl shadow-sm border border-slate-200 hover:border-indigo-400 transition"
            >
              {shop.image_url ? (
                <img src={shop.image_url} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-100 text-4xl font-extrabold text-indigo-300">
                  {shop.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="p-5">
                <h2 className="text-lg font-bold text-slate-800">{shop.name}</h2>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {shop.description}
                </p>
                <p className="text-xs text-slate-400 mt-1">{shop.address}</p>
                <p className="text-xs text-indigo-700 mt-3 font-medium">Open shop →</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}