import api from  "./axios"

export const getMyShops = () => api.get("/shops");
export const getShop = (id) => api.get(`/shop/${id}/`);
export const getShopProducts =(id) => api.get(`/products/?shop=${id}`);