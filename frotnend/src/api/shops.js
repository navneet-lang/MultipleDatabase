import api from  "./axios"

export const getMyShops = () => api.get("/shops");
export const getShop = (id) => api.get(`/shop/${id}/`);
export const createShop =(data)=> api.post("/shops/", data);
export const getShopProducts =(id) => api.get("/products", {params: {shop: id, shop_id:id}});