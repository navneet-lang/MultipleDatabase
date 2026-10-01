import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth(); // 'logding' ko fix karke 'loading' kar diya

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Yeh line missing thi! Yahi Dashboard component ko screen par laati hai
  return children; 
}