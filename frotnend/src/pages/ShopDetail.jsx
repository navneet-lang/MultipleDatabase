import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyShops, getShop, getShopProducts, updateShop } from "../api/shops";

export default function ShopDetail() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [updatingImage, setUpdatingImage] = useState(false);

  const handleShopImageChange = async (event) => {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;

    setImageError("");
    setUpdatingImage(true);
    const data = new FormData();
    data.append("image", image);

    try {
      const response = await updateShop(id, data);
      setShop(response.data);
    } catch (err) {
      const responseData = err.response?.data;
      setImageError(
        responseData?.detail ||
          (responseData ? JSON.stringify(responseData) : "Shop image update nahi ho payi.")
      );
    } finally {
      setUpdatingImage(false);
    }
  };

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

      <div className="mt-4 mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid md:min-h-72 md:grid-cols-[minmax(280px,0.85fr)_1.15fr]">
          <div className="flex min-h-56 items-center justify-center bg-slate-100 p-4 md:min-h-72">
            {shop.image_url ? (
              <img
                src={shop.image_url}
                alt={`${shop.name} cover`}
                className="max-h-72 w-full rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-full min-h-48 w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-slate-200 text-6xl font-extrabold text-indigo-300">
                {shop.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center bg-gradient-to-br from-indigo-950 to-indigo-800 p-6 text-white sm:p-8">
            <h1 className="text-3xl font-extrabold sm:text-4xl">{shop.name}</h1>
            {shop.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">{shop.description}</p>
            )}
            <p className="mt-3 text-sm text-white/75">
              {shop.address} <span aria-hidden="true">·</span> {products.length} products
            </p>
            {imageError && (
              <p role="alert" className="mt-2 text-sm text-red-200">{imageError}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-lg border border-white/50 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
                {updatingImage ? "Uploading..." : shop.image_url ? "Change shop photo" : "Add shop photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleShopImageChange}
                  disabled={updatingImage}
                  className="sr-only"
                />
              </label>
              <Link
                to={`/add-product?shop=${shop.id}`}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-900 hover:bg-indigo-50"
              >
                + Add Product
              </Link>
            </div>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-500">Is shop mein abhi koi product nahi hai.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
              <Link to={`/products/${p.id}`} className="block">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-48 w-full bg-slate-50 object-contain p-2" />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-400">
                    No product image
                  </div>
                )}
              </Link>
              <div className="p-4">
                <Link to={`/products/${p.id}`} className="font-bold text-slate-800 hover:text-indigo-700">
                  {p.name}
                </Link>
                <p className="text-indigo-600 font-extrabold">₹{p.price}</p>
                <p className="text-xs text-slate-400">{p.stock} in stock</p>
                <Link to={`/products/${p.id}`} className="mt-3 inline-block text-sm font-semibold text-indigo-700 hover:underline">
                  View product →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}