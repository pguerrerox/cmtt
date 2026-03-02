import { apiClient } from './client.js'

export function createOrder(payload) {
  return apiClient.post('/api/orders', payload)
}
