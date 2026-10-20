import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSellerOrderItems, getSellerSummary, updateSellerOrderItemStatus } from "../api/order";
import { getMyShops } from "../api/shops";

const nextStatus = {
  pending: { label: "Confirm order", value: "confirmed" },
  confirmed: { label: "Mark as shipped", value: "shipped" },
  shipped: { label: "Mark delivered", value: "delivered" },
};

export default function SellerDashboard() {
  const [shops, setShops] = useState([]);
  const [summary, setSummary] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingItem, setUpdatingItem] = useState(null);

  const loadDashboard = useCallback(async () => {
    const [shopsResult, summaryResult, ordersResult] = await Promise.allSettled([
      getMyShops(),
      getSellerSummary(),
      getSellerOrderItems({ limit: 8 }),
    ]);

    const errors = [];
    if (shopsResult.status === "fulfilled") {
      setShops(shopsResult.value.data.results || shopsResult.value.data || []);
    } else {
      console.error("Seller shops load error:", shopsResult.reason);
      errors.push("shops");
    }
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value.data);
    else {
      console.error("Seller summary load error:", summaryResult.reason);
      errors.push("sales summary");
    }
    if (ordersResult.status === "fulfilled") {
      setOrderItems(ordersResult.value.data.results || []);
    } else {
      console.error("Seller orders load error:", ordersResult.reason);
      errors.push("orders");
    }

    if (errors.length) setError(`Some dashboard data could not load: ${errors.join(", ")}.`);
  }, []);

  useEffect(() => {
    let active = true;
    loadDashboard()
      .catch((err) => {
        console.error("Seller dashboard load error:", err);
        if (active) setError("Dashboard load nahi ho paya. Refresh karke dobara try karein.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  const updateStatus = async (item, status) => {
    setUpdatingItem(item.id);
    setError("");
    try {
      await updateSellerOrderItemStatus(item.id, status);
      await loadDashboard();
    } catch (err) {
      console.error("Seller order update error:", err);
      setError(
        err.response?.data?.detail ||
          "Order status update nahi ho paya. Dobara try karein."
      );
    } finally {
      setUpdatingItem(null);
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-7xl px-5 py-12 text-slate-500">Loading your seller dashboard...</main>;
  }

  const stats = [
    { label: "Active shops", value: shops.length },
    { label: "Orders", value: summary?.total_orders ?? 0 },
    { label: "Pending items", value: summary?.pending_items ?? 0 },
    { label: "Total sales", value: `₹${Number(summary?.total_sales || 0).toLocaleString("en-IN")}` },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-800 px-5 py-9 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200">Seller workspace</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Your business, at a glance.</h1>
            <p className="mt-2 text-sm text-indigo-100">Manage shops, products, and customer orders.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/my-shops" className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold hover:bg-white/10">
              Manage shops
            </Link>
            <Link to="/create-shop" className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-900 hover:bg-indigo-50">
              + Create shop
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        {error && (
          <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-indigo-950">{stat.value}</p>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Your shops</h2>
              <p className="mt-1 text-sm text-slate-500">Open a shop to manage its products and branding.</p>
            </div>
            <Link to="/my-shops" className="text-sm font-semibold text-indigo-700 hover:underline">View all</Link>
          </div>

          {shops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h3 className="font-bold text-slate-900">Start selling on Bazaario</h3>
              <p className="mt-1 text-sm text-slate-500">Create your first shop, then add products to it.</p>
              <Link to="/create-shop" className="mt-4 inline-flex rounded-lg bg-indigo-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">
                Create your first shop
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.slice(0, 3).map((shop) => (
                <Link
                  key={shop.id}
                  to={`/shops/${shop.id}`}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {shop.image_url ? (
                    <img src={shop.image_url} alt="" className="h-36 w-full bg-slate-100 object-contain p-2" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-100 text-4xl font-extrabold text-indigo-300">
                      {shop.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900">{shop.name}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">{shop.address}</p>
                    <span className="mt-3 inline-block text-sm font-semibold text-indigo-700">Manage shop →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Recent orders</h2>
              <p className="mt-1 text-sm text-slate-500">Update fulfillment for products sold by your shops.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {summary?.pending_items || 0} pending
            </span>
          </div>
          {orderItems.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">New orders for your shops will appear here.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {orderItems.map((item) => {
                const action = nextStatus[item.status];
                return (
                  <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-[180px] flex-1">
                      <p className="font-semibold text-slate-900">{item.name} × {item.quantity}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Order #{item.order_id} · Buyer: {item.buyer_username}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{item.address}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-slate-900">
                        ₹{Number(item.line_total).toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 capitalize text-slate-500">{item.status}</p>
                    </div>
                    {action && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(item, action.value)}
                          disabled={updatingItem === item.id}
                          className="rounded-lg bg-indigo-900 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
                        >
                          {updatingItem === item.id ? "Updating..." : action.label}
                        </button>
                        {["pending", "confirmed"].includes(item.status) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Cancel order #${item.order_id} item "${item.name}"?`)) {
                                updateStatus(item, "cancelled");
                              }
                            }}
                            disabled={updatingItem === item.id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
