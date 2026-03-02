import { apiClient } from './client.js'

function normalizeSalesManager(row) {
  if (!row) return row
  return {
    ...row,
    name: row.fullname,
    active: row.isActive
  }
}

function toSalesManagerPayload(payload) {
  const { name, active, telephone, ...rest } = payload ?? {}
  return {
    ...rest,
    fullname: rest.fullname ?? name,
    isActive: rest.isActive ?? active ?? 1
  }
}

export function getSalesManagers() {
  return apiClient.get('/api/sales-managers').then((result) => ({
    ...result,
    data: (result?.data ?? []).map(normalizeSalesManager)
  }))
}

export function getSalesManagerById(salesManagerId) {
  return apiClient.get(`/api/sales-managers/${salesManagerId}`).then((result) => ({
    ...result,
    data: normalizeSalesManager(result?.data)
  }))
}

export function createSalesManager(payload) {
  return apiClient.post('/api/admin/sales-managers', toSalesManagerPayload(payload))
}

export function updateSalesManager(salesManagerId, payload) {
  return apiClient.patch(`/api/admin/sales-managers/${salesManagerId}`, toSalesManagerPayload(payload))
}

export function deleteSalesManager(salesManagerId) {
  return apiClient.delete(`/api/admin/sales-managers/${salesManagerId}`)
}
