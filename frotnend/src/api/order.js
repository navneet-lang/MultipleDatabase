import api from "./axios"

export const placeOrder = (address)=> api.post("/orders/checkout/", {address});
export const  getMyOrders = () => api.get("/orders/");  