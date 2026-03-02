import { apiClient } from './client.js'

function normalizeProjectEngineer(row) {
  if (!row) return row
  return {
    ...row,
    name: row.fullname,
    active: row.isActive
  }
}

function toProjectEngineerPayload(payload) {
  const { name, active, ext, ...rest } = payload ?? {}
  return {
    ...rest,
    fullname: rest.fullname ?? name,
    isActive: rest.isActive ?? active ?? 1
  }
}

export function getProjectEngineers() {
  return apiClient.get('/api/project-engineers').then((result) => ({
    ...result,
    data: (result?.data ?? []).map(normalizeProjectEngineer)
  }))
}

export function getProjectEngineerById(projectEngineerId) {
  return apiClient.get(`/api/project-engineers/${projectEngineerId}`).then((result) => ({
    ...result,
    data: normalizeProjectEngineer(result?.data)
  }))
}

export function createProjectEngineer(payload) {
  return apiClient.post('/api/admin/project-engineers', toProjectEngineerPayload(payload))
}

export function updateProjectEngineer(projectEngineerId, payload) {
  return apiClient.patch(`/api/admin/project-engineers/${projectEngineerId}`, toProjectEngineerPayload(payload))
}

export function deleteProjectEngineer(projectEngineerId) {
  return apiClient.delete(`/api/admin/project-engineers/${projectEngineerId}`)
}
