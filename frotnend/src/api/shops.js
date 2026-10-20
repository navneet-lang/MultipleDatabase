import api from  "./axios"

export const getMyShops = () => api.get("/shops");
export const getFeaturedShops = (params) => api.get("/shops/featured/", { params });
export const getShop = (id) => api.get(`/shops/${id}/`);
export const createShop = (data) =>
  api.post("/shops/", data, { headers: { "Content-Type": "multipart/form-data" } });
export const updateShop = (id, data) =>
  api.patch(`/shops/${id}/`, data, { headers: { "Content-Type": "multipart/form-data" } });
export const getShopProducts =(id) => api.get("/products", {params: {shop: id, shop_id:id}});