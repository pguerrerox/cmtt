import { apiClient } from './client.js'

function normalizeFacility(row) {
  if (!row) return row
  return {
    ...row,
    name: row.plant_name,
    address: row.plant_address,
    contacts: row.plant_contacts
  }
}

function toFacilityPayload(payload) {
  const source = payload ?? {}
  return {
    customer_id: source.customer_id,
    plant_name: source.plant_name ?? source.name,
    plant_address: source.plant_address ?? source.address,
    plant_contacts: source.plant_contacts ?? source.contacts
  }
}

export function getFacilities() {
  return apiClient.get('/api/customer-facilities').then((result) => ({
    ...result,
    data: (result?.data ?? []).map(normalizeFacility)
  }))
}

export function getFacilityById(facilityId) {
  return apiClient.get(`/api/customer-facilities/${facilityId}`).then((result) => ({
    ...result,
    data: normalizeFacility(result?.data)
  }))
}

export function createFacility(payload) {
  return apiClient.post('/api/customer-facilities', toFacilityPayload(payload))
}

export function updateFacility(facilityId, payload) {
  return apiClient.patch(`/api/customer-facilities/${facilityId}`, toFacilityPayload(payload))
}

export function deleteFacility(facilityId) {
  return apiClient.delete(`/api/customer-facilities/${facilityId}`)
}
