import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getShop, getShopProducts } from "../api/shops";

export default function ShopStorefront() {
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
      try {
        const [shopResponse, productsResponse] = await Promise.all([
          getShop(id),
          getShopProducts(id),
        ]);
        if (!active) return;

        setShop(shopResponse.data);
        const items = productsResponse.data.results || productsResponse.data || [];
        setProducts(items.filter((product) => String(product.shop_id) === String(id)));
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Shop abhi load nahi ho paayi. Thodi der baad dobara try karein."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-12 text-slate-500">Loading shop...</main>;
  }

  if (!shop) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p role="alert" className="text-red-600">{error || "Shop nahi mili."}</p>
        <Link to="/products" className="mt-4 inline-block text-sm font-semibold text-indigo-700 hover:underline">
          ← Back to products
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/products" className="text-sm font-medium text-indigo-700 hover:underline">
          ← Continue shopping
        </Link>

        <section className="mt-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[minmax(280px,0.85fr)_1.15fr]">
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
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-200">Store</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{shop.name}</h1>
            {shop.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">{shop.description}</p>
            )}
            <p className="mt-3 text-sm text-white/75">{shop.address}</p>
            <p className="mt-2 text-sm text-white/75">{products.length} products</p>
          </div>
        </section>

        <section className="py-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Products from this shop</h2>
              <p className="mt-1 text-sm text-slate-500">Select a product to see details and customer reviews.</p>
            </div>
          </div>

          {products.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Is shop mein abhi koi product available nahi hai.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Link to={`/products/${product.id}`} className="block">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-56 w-full bg-slate-50 object-contain p-3"
                      />
                    ) : (
                      <div className="flex h-56 items-center justify-center bg-slate-100 text-sm text-slate-400">
                        No product image
                      </div>
                    )}
                  </Link>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      {product.category}
                    </p>
                    <Link
                      to={`/products/${product.id}`}
                      className="mt-1 block text-lg font-bold text-slate-900 hover:text-indigo-700"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xl font-extrabold text-indigo-900">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </span>
                      <span className={`text-xs font-medium ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {product.stock > 0 ? "In stock" : "Out of stock"}
                      </span>
                    </div>
                    <Link
                      to={`/products/${product.id}`}
                      className="mt-4 block rounded-lg bg-indigo-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-800"
                    >
                      View details & reviews
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
