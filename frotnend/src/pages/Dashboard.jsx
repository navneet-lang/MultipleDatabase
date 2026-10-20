import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BuyerDashboard from "./BuyerDashboard";
import SellerDashboard from "./SellerDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === "seller") return <SellerDashboard />;
  if (user?.role === "user") return <BuyerDashboard />;
  if (user?.role === "admin") return <BuyerDashboard />;

  return <Navigate to="/login" replace />;
}
