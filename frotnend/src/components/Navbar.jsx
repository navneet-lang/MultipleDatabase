import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe, logoutUser } from "../api/auth";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setOpen(false);
      navigate("/login");
    }
  };

  const role = user?.role;
  const home =
    role === "seller" ? "/my-shops" : role === "admin" ? "/dashboard" : "/products";
  const link = "text-sm font-medium text-slate-600 hover:text-indigo-900";

  return (
    <nav className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
      <Link to={home} className="text-xl font-extrabold text-indigo-900">
        Bazaario
      </Link>

      <div className="flex items-center gap-6">
        {/* Seller */}
        {role === "seller" && (
          <Link to="/my-shops" className={link}>
            My Shops
          </Link>
        )}

        {/* Admin */}
        {role === "admin" && (
          <>
            <Link to="/dashboard" className={link}>Dashboard</Link>
            <Link to="/my-shops" className={link}>My Shops</Link>
            <Link to="/products" className={link}>Products</Link>
          </>
        )}

        {/* Customer (role: "users") */}
        {role === "users" && (
          <>
            <Link to="/products" className={link}>Products</Link>
            <Link to="/cart" className={link}>Cart</Link>
          </>
        )}

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-slate-200 pl-1 pr-3 py-1 hover:bg-slate-50 transition cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-indigo-900 text-white flex items-center justify-center font-bold uppercase text-xs">
                {user.username?.[0] || "U"}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {user.username || "User"}
              </span>
              {user.role && (
                <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
                  {user.role}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-400">
                  Logged in as
                  <p className="text-sm text-slate-800 font-semibold truncate">
                    {user.username}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-indigo-900 hover:text-indigo-700"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-indigo-900 text-white px-3.5 py-1.5 rounded-lg hover:bg-indigo-800 transition"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}