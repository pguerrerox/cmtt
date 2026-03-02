import { apiClient } from './client.js'

function normalizeManager(manager) {
  if (!manager) return manager
  return {
    ...manager,
    name: manager.username,
    username: manager.username
  }
}

function toManagerPayload(payload) {
  const { name, ...rest } = payload ?? {}
  return {
    ...rest,
    username: rest.username ?? name
  }
}

export function getManagersPublic() {
  return apiClient.get('/api/managers').then((rows) => (rows ?? []).map(normalizeManager))
}

export function getManagersAdmin() {
  return apiClient.get('/api/admin/managers').then((rows) => (rows ?? []).map(normalizeManager))
}

export function createManager(payload) {
  return apiClient.post('/api/admin/createManager', toManagerPayload(payload))
}

export function updateManager(id, payload) {
  return apiClient.patch(`/api/admin/updateManager/${id}`, toManagerPayload(payload))
}

export function deleteManager(id) {
  return apiClient.delete(`/api/admin/deleteManager/${id}`)
}
