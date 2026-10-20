import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyOrders, getOrder } from "../api/order";

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-800",
    confirmed: "bg-blue-50 text-blue-800",
    shipped: "bg-indigo-50 text-indigo-800",
    delivered: "bg-emerald-50 text-emerald-800",
    cancelled: "bg-red-50 text-red-800",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export default function BuyerOrders() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState("");
  const currentKey = id || "list";

  useEffect(() => {
    let active = true;

    const request = id ? getOrder(id) : getMyOrders();
    request
      .then((response) => {
        if (!active) return;
        setError("");
        if (id) setSelectedOrder(response.data);
        else setOrders(response.data.results || []);
      })
      .catch((err) => {
        console.error("Order history load error:", err);
        if (active) {
          setError(
            err.response?.data?.detail || "Orders load nahi ho paaye. Dobara try karein."
          );
        }
      })
      .finally(() => {
        if (active) setLoadedKey(currentKey);
      });

    return () => {
      active = false;
    };
  }, [currentKey, id]);

  if (loadedKey !== currentKey) {
    return <main className="mx-auto max-w-5xl px-5 py-12 text-slate-500">Loading orders...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p role="alert" className="text-red-600">{error}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-indigo-700 hover:underline">
          ← Dashboard
        </Link>
      </main>
    );
  }

  if (selectedOrder) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-8">
          <Link to="/orders" className="text-sm font-semibold text-indigo-700 hover:underline">
            ← Order history
          </Link>
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Order #{selectedOrder.id}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Placed {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <div className="divide-y divide-slate-100">
              {(selectedOrder.items || []).map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <Link to={`/products/${item.product_id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      ₹{Number(item.price).toLocaleString("en-IN")} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">
                      ₹{Number(item.line_total).toLocaleString("en-IN")}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-between gap-4 border-t border-slate-100 pt-5">
              <div>
                <p className="text-sm font-semibold text-slate-800">Delivery address</p>
                <p className="mt-1 text-sm text-slate-500">{selectedOrder.address}</p>
              </div>
              <p className="text-lg font-extrabold text-indigo-900">
                Total: ₹{Number(selectedOrder.total_amount).toLocaleString("en-IN")}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">Your account</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Order history</h1>
            <p className="mt-2 text-sm text-slate-500">Track purchases and check each item’s delivery status.</p>
          </div>
          <Link to="/products" className="rounded-lg bg-indigo-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">
            Continue shopping
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="font-bold text-slate-900">No orders yet</h2>
            <p className="mt-1 text-sm text-slate-500">Your purchases will appear here.</p>
            <Link to="/products" className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:underline">
              Explore products →
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">Order #{order.id}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString()} · {order.items?.length || 0} items
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-indigo-900">
                      ₹{Number(order.total_amount).toLocaleString("en-IN")}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <p className="mt-3 line-clamp-1 text-sm text-slate-600">
                  {(order.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", ")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
