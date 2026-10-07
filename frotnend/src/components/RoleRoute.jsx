import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMe } from "../api/auth";

const homeFor = (role) =>
  role === "seller" ? "/my-shops" : role === "admin" ? "/dashboard" : "/products";

export default function RoleRoute({ allow }) {
  const [role, setRole] = useState(undefined);

  useEffect(() => {
    getMe()
      .then((res) => setRole(res.data.role))
      .catch(() => setRole(null));
  }, []);

  if (role === undefined) return null;
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to={homeFor(role)} replace />;
  return <Outlet />;
}                  