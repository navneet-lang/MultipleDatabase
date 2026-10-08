import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearCart, getCart, removeCartItem, updateCartItem } from "../api/cart";
import { placeOrder } from "../api/orders";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null); // order response

  const loadCart = () => {
    getCart()
      .then((res) => {
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .catch((err) => console.error("Cart load error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleQuantityChange = async (item, newQty) => {
    if (newQty < 1) return;
    setError("");
    try {
      await updateCartItem(item.cart_item_id, newQty);
      loadCart();
    } catch (err) {
      setError(err.response?.data?.detail || "Update nahi ho paya.");
    }
  };

  const handleRemove = async (id) => {
    setError("");
    try {
      await removeCartItem(id);
      loadCart();
    } catch (err) {
      setError(err.response?.data?.detail || "Remove nahi ho paya.");
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      loadCart();
    } catch {
      setError("Cart clear nahi ho paya.");
    }
  };

  const handlePlaceOrder = async () => {
    setError("");
    if (!address.trim()) {
      setError("Delivery address daalo.");
      return;
    }
    setPlacing(true);
    try {
      const res = await placeOrder(address.trim());
      setPlaced(res.data);
      setItems([]);
      setTotal(0);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || (data ? JSON.stringify(data) : "Order place nahi ho paya."));
      loadCart(); // stock badla ho to latest dikhao
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        Loading cart...
      </div>
    );
  }

  // Order successful
  if (placed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-2xl font-extrabold text-indigo-900">Order placed!</h1>
          <p className="text-slate-500 mt-1">Order #{placed.id}</p>
          <p className="text-slate-700 mt-3 font-semibold">Total: ₹{placed.total_amount}</p>
          {placed.address && (
            <p className="text-sm text-slate-500 mt-2">Delivery: {placed.address}</p>
          )}
          <Link
            to="/products"
            className="inline-block mt-6 bg-indigo-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-800"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-extrabold text-indigo-900 mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-slate-500">
          Cart khaali hai.{" "}
          <Link to="/products" className="text-indigo-700 font-medium hover:underline">
            Products dekho
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const atMax = item.stock !== undefined && item.quantity >= item.stock;
              return (
                <div
                  key={item.cart_item_id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-md flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                    No image
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-slate-800 truncate">{item.name}</h2>
                    <p className="text-indigo-600 font-bold">₹{item.price}</p>
                    {item.stock !== undefined && (
                      <p className="text-xs text-slate-400">{item.stock} in stock</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item, item.quantity + 1)}
                      disabled={atMax}
                      className="w-8 h-8 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <p className="w-20 text-right font-semibold text-indigo-900">₹{item.line_total}</p>

                  <button
                    onClick={() => handleRemove(item.cart_item_id)}
                    className="text-red-600 text-sm font-semibold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            <button onClick={handleClear} className="text-sm text-slate-500 hover:underline">
              Clear cart
            </button>
          </div>

          {/* Right: summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-fit">
            <h2 className="text-xl font-extrabold text-indigo-900 mb-4">Order Summary</h2>

            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Items</span>
              <span>{items.reduce((n, i) => n + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Subtotal</span>
              <span>₹{total}</span>
            </div>
            <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-200 pt-3 mt-3">
              <span>Total</span>
              <span>₹{total}</span>
            </div>

            <h3 className="text-lg font-bold text-indigo-900 mt-6 mb-2">Delivery Address</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Enter a delivery address"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
            />

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="mt-4 w-full bg-indigo-900 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 transition disabled:opacity-50"
            >
              {placing ? "Placing order..." : "Proceed to Checkout / Place Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}