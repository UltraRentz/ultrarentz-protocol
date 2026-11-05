import axios, { type AxiosInstance } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// REMOVE the request interceptor that looks for 'authToken' in localStorage
// Since Particle handles on-chain auth, you don't need this local JWT logic.

// Keep only the API endpoints you actually use for the demo:
export const depositsApi = {
  syncDeposit: (chainId: number) => api.post(`/deposits/sync/${chainId}`),
};

export const yieldDepositsApi = {
  create: (data: any) => api.post("/yield-deposits", data),
};

export default api;