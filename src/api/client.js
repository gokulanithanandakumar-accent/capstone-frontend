import axios from 'axios';
import { clearSession, readSession } from '../auth/session';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export function attachToken(config) {
  const session = readSession();
  if (session?.accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
}

export function handleUnauthorized(error) {
  const isLoginCall = error?.config?.url?.includes('/auth/login');
  if (error?.response?.status === 401 && !isLoginCall) {
    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
  return Promise.reject(error);
}

apiClient.interceptors.request.use(attachToken);
apiClient.interceptors.response.use((response) => response, handleUnauthorized);

export function extractErrorMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export default apiClient;
