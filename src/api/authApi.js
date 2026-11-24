import apiClient from './client';

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function fetchCurrentCustomer() {
  const { data } = await apiClient.get('/customers/me');
  return data;
}
