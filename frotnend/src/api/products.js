import api from "./axios";

export const getProducts = (params)=> api.get("/products/", {params});
export const getCategories = ()=> api.get("/products/categories/")
export const getTrendingProducts = (params) => api.get("/products/trending/", { params });
export const getProduct = (productId) => api.get(`/products/${productId}/`);
export const getProductReviews = (productId) => api.get(`/products/${productId}/reviews/`);
export const getProductRating = (productId) => api.get(`/products/${productId}/rating/`);
export const addProductReview = (productId, review) =>
  api.post(`/products/${productId}/reviews/`, review);
export const uploadProductImage = (productId, image) => {
  const data = new FormData();
  data.append("image", image);
  return api.post(`/products/${productId}/image/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};