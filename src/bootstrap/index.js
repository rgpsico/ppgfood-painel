import axios from "axios";

import { URI_BASE_API, TOKEN_NAME } from "../configs/api";

axios.defaults.baseURL = URI_BASE_API;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_NAME);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem(TOKEN_NAME);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
