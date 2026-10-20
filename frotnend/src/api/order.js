import api from "./axios"

export const placeOrder = (address)=> api.post("/orders/checkout/", {address});
export const getMyOrders = () => api.get("/orders/");
export const getOrder = (orderId) => api.get(`/orders/${orderId}/`);
export const getSellerSummary = () => api.get("/orders/seller/summary/");
export const getSellerOrderItems = (params) => api.get("/orders/seller/items/", { params });
export const updateSellerOrderItemStatus = (itemId, status) =>
  api.patch(`/orders/seller/items/${itemId}/status/`, { status });