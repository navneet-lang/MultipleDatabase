import api from "./axios";

export const addToCart = (productId, quantity = 1) =>
  api.post("/cart/", { product_id: productId, quantity });

export const getCart = () => api.get("/cart/");

export const updateCartItem = (itemId, quantity) =>
  api.patch(`/cart/${itemId}/`, { quantity });

export const removeCartItem = (itemId) => api.delete(`/cart/${itemId}/`);

export const clearCart = () => api.delete("/cart/clear/");