import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProductCatalog from "./pages/ProductCatalog";
import Cart from "./pages/Cart";
import AddProduct from "./pages/AddProduct";
import MyShops from "./pages/MyShops";
import ShopDetail from "./pages/ShopDetail";
import CreateShop from "./pages/CreateShop";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public pages (navbar nahi) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Logged-in pages: navbar + login check */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Seller + Admin */}
            <Route element={<RoleRoute allow={["seller", "admin"]} />}>
              <Route path="/my-shops" element={<MyShops />} />
              <Route path="/shops/:id" element={<ShopDetail />} />
              <Route path="/create-shop" element={<CreateShop />} />
              <Route path="/add-product" element={<AddProduct />} />
            </Route>

            {/* Customer + Admin */}
            <Route element={<RoleRoute allow={["users", "admin"]} />}>
              <Route path="/products" element={<ProductCatalog />} />
              <Route path="/cart" element={<Cart />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}