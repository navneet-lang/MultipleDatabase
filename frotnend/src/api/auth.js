import api from "./axios";

export const getMe = () => api.get("/auth/me/");
export const logoutUser = () => api.post("/auth/logout/");
export const googleLogin = (credential) =>
  api.post("/auth/google/", { credential });                