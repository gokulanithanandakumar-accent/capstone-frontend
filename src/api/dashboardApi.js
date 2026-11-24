import apiClient from './client';

export async function fetchMyPolicies() {
  const { data } = await apiClient.get('/policies/me');
  return data;
}

export async function fetchAvailableProducts() {
  const { data } = await apiClient.get('/products/available');
  return data;
}

export async function generateRecommendations(payload) {
  const { data } = await apiClient.post('/recommendations', payload);
  return data;
}

export async function fetchRegistrationDetails(productId, startDate) {
  const params = startDate ? { productId, startDate } : { productId };
  const { data } = await apiClient.get('/policies/registration-details', { params });
  return data;
}

export async function registerPolicy(payload) {
  const { data } = await apiClient.post('/policies', payload);
  return data;
}

export async function fetchPolicyPremiums(policyNumber) {
  const { data } = await apiClient.get(`/policies/${encodeURIComponent(policyNumber)}/premiums`);
  return data;
}

export async function searchPolicies(params) {
  const { data } = await apiClient.get('/policies/search', { params });
  return data;
}

export async function payPremiums(policyNumber, payload) {
  const { data } = await apiClient.post(`/policies/${encodeURIComponent(policyNumber)}/premium-payments`, payload);
  return data;
}
