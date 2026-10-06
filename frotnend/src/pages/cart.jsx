import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearCart, getCart, removeCartItem, updateCartItem } from "../api/cart";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadCart = () => {
    setLoading(true);
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

  const handleQuantityChange = async (cartItemId, newQty) => {
    if (newQty < 1) return;
    try {
      await updateCartItem(cartItemId, newQty);
      loadCart();
    } catch (err) {
      alert(err.response?.data?.detail || "Update nahi ho paya.");
    }
  };

  const handleRemove = async (cartItemId) => {
    try {
      await removeCartItem(cartItemId);
      loadCart();
    } catch (err) {
      alert(err.response?.data?.detail || "Remove nahi ho paya.");
    }
  };

  const handleClear = async () => {
    try {
      await clearCart();
      loadCart();
    } catch (err) {
      alert("Cart clear nahi ho paya.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        Loading cart...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-indigo-900 mb-6">Your Cart</h1>
          
        {items.length === 0 ? (
          <p className="text-slate-500">Cart khaali hai.</p>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <h2 className="font-bold text-slate-800">{item.name}</h2>
                    <p className="text-sm text-slate-500">₹{item.price} each</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(item.cart_item_id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full border border-slate-300 hover:bg-slate-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.cart_item_id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full border border-slate-300 hover:bg-slate-100"
                    >
                      +
                    </button>
                   
                    <p className="w-20 text-right font-semibold text-indigo-900">
                      ₹{item.line_total}
                    </p>

                    <button
                      onClick={() => handleRemove(item.cart_item_id)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={handleClear} className="text-sm text-slate-500 hover:underline">
                Clear cart
              </button>
              <p className="text-xl font-extrabold text-indigo-900">Total: ₹{total}</p>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="mt-6 w-full bg-indigo-900 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 transition"
            >
              Proceed to Checkout
            </button>
          </>
        )}
      </div>
    </div>
  );
}