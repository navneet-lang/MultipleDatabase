import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders } from "../api/order";
import { getCategories, getTrendingProducts } from "../api/products";
import { getFeaturedShops } from "../api/shops";

function ProductCard({ product }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/products/${product.id}`} className="flex h-44 items-center justify-center bg-slate-100 p-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-sm text-slate-400">No product image</span>
        )}
      </Link>
      <div className="p-4">
        <Link to={`/products/${product.id}`} className="font-bold text-slate-900 hover:text-indigo-700">
          {product.name}
        </Link>
        {product.shop_name && (
          <p className="mt-1 text-xs text-slate-500">Sold by {product.shop_name}</p>
        )}
        <p className="mt-2 text-lg font-extrabold text-indigo-900">
          ₹{Number(product.price).toLocaleString("en-IN")}
        </p>
      </div>
    </article>
  );
}

export default function BuyerDashboard() {
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      getCategories(),
      getFeaturedShops({ limit: 4 }),
      getTrendingProducts({ limit: 4 }),
      getMyOrders(),
    ]).then(([categoryResult, shopResult, productResult, orderResult]) => {
      if (!active) return;
      const nextErrors = {};

      if (categoryResult.status === "fulfilled") setCategories(categoryResult.value.data);
      else {
        console.error("Dashboard categories load error:", categoryResult.reason);
        nextErrors.categories = "Categories load nahi ho paayi.";
      }

      if (shopResult.status === "fulfilled") setShops(shopResult.value.data);
      else {
        console.error("Dashboard shops load error:", shopResult.reason);
        nextErrors.shops = "Featured shops load nahi ho paayi.";
      }

      if (productResult.status === "fulfilled") {
        setProducts(productResult.value.data.results || []);
      } else {
        console.error("Dashboard products load error:", productResult.reason);
        nextErrors.products = "Products load nahi ho paaye.";
      }

      if (orderResult.status === "fulfilled") {
        setOrders(orderResult.value.data.results || []);
      } else {
        console.error("Dashboard orders load error:", orderResult.reason);
        nextErrors.orders = "Recent orders load nahi ho paaye.";
      }

      setErrors(nextErrors);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-700 px-5 py-10 text-white sm:px-8 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">
            Bazaario marketplace
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold sm:text-5xl">
            Discover something you’ll love.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
            Browse local shops, find everyday favourites, and track your orders in one place.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-bold text-indigo-900 transition hover:bg-indigo-50"
          >
            Explore all products
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-5 py-9 sm:px-8">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Shop by category</h2>
              <p className="mt-1 text-sm text-slate-500">Find what you need, faster.</p>
            </div>
            <Link to="/products" className="text-sm font-semibold text-indigo-700 hover:underline">
              View all
            </Link>
          </div>
          {errors.categories ? (
            <p role="alert" className="text-sm text-red-600">{errors.categories}</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-500">Categories will appear as products are added.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  to={`/products?category=${encodeURIComponent(category.name)}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-800"
                >
                  {category.name}
                  <span className="ml-2 text-xs text-slate-400">{category.count}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Featured local shops</h2>
              <p className="mt-1 text-sm text-slate-500">Meet the sellers on Bazaario.</p>
            </div>
          </div>
          {errors.shops ? (
            <p role="alert" className="text-sm text-red-600">{errors.shops}</p>
          ) : shops.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              Shops will appear here soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shops.map((shop) => (
                <Link
                  key={shop.id}
                  to={`/store/${shop.id}`}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {shop.image_url ? (
                    <img src={shop.image_url} alt="" className="h-32 w-full bg-slate-100 object-contain p-2" />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-100 text-4xl font-extrabold text-indigo-300">
                      {shop.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900">{shop.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{shop.description || shop.address}</p>
                    <span className="mt-3 inline-block text-sm font-semibold text-indigo-700">Visit shop →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Trending products</h2>
              <p className="mt-1 text-sm text-slate-500">Popular picks from across Bazaario.</p>
            </div>
            <Link to="/products" className="text-sm font-semibold text-indigo-700 hover:underline">
              Browse all
            </Link>
          </div>
          {errors.products ? (
            <p role="alert" className="text-sm text-red-600">{errors.products}</p>
          ) : products.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              Products will appear here soon.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Your recent orders</h2>
              <p className="mt-1 text-sm text-slate-500">Keep track of your purchases.</p>
            </div>
            <Link to="/orders" className="text-sm font-semibold text-indigo-700 hover:underline">
              Order history
            </Link>
          </div>
          {errors.orders ? (
            <p role="alert" className="text-sm text-red-600">{errors.orders}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-500">Aapka order place karne ke baad yahan dikhega.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 3).map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:text-indigo-800"
                >
                  <span className="font-semibold">Order #{order.id}</span>
                  <span className="text-slate-500">{order.items?.length || 0} items</span>
                  <span className="font-semibold">₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-800">
                    {order.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
