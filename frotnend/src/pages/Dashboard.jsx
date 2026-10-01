import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <span className="inline-block rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 uppercase tracking-wider">
          {user?.role}
        </span>
        <h1 className="mt-4 font-extrabold text-3xl text-slate-800">
          Welcome, {user?.username}
        </h1>
        <p className="mt-3 text-slate-500">
          Aapka authentication successful hai. Ab products explore karein!
        </p>
        
        {/* Naya Button: Products page par jane ke liye */}
        <button
          onClick={() => navigate('/products')}
          className="mt-8 w-full rounded-lg bg-indigo-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 shadow-md"
        >
          View Products
        </button>

        <button
          onClick={logout}
          className="mt-4 w-full rounded-lg border-2 border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Log out
        </button>
      </div>
    </div>
  );
}