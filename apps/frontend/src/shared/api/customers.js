import { apiClient } from './client.js'

function normalizeCustomer(row) {
  if (!row) return row
  return {
    ...row,
    country: row.headquarters_address,
    salesmanager_id: row.sales_manager_id,
    projecteng_id: row.project_engineer_id,
    salesmanager_name: row.sales_manager_name,
    projecteng_name: row.project_engineer_name
  }
}

function toCustomerPayload(payload) {
  const source = payload ?? {}
  return {
    name: source.name,
    headquarters_address: source.headquarters_address ?? source.country,
    headquarter_contacts: source.headquarter_contacts,
    project_manager_id: source.project_manager_id,
    sales_manager_id: source.sales_manager_id ?? source.salesmanager_id,
    project_engineer_id: source.project_engineer_id ?? source.projecteng_id
  }
}

export function getCustomers() {
  return apiClient.get('/api/customers').then((result) => ({
    ...result,
    data: (result?.data ?? []).map(normalizeCustomer)
  }))
}

export function getCustomerById(customerId) {
  return apiClient.get(`/api/customers/${customerId}`).then((result) => ({
    ...result,
    data: normalizeCustomer(result?.data)
  }))
}

export function createCustomer(payload) {
  return apiClient.post('/api/customers', toCustomerPayload(payload))
}

export function updateCustomer(customerId, payload) {
  return apiClient.patch(`/api/customers/${customerId}`, toCustomerPayload(payload))
}

export function deleteCustomer(customerId) {
  return apiClient.delete(`/api/customers/${customerId}`)
}
