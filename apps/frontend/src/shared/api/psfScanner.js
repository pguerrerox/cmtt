import { apiClient } from './client.js'

export function scanPsfFile(file, uploadedBy = null) {
  const formData = new FormData()
  formData.append('psf', file)
  if (uploadedBy) formData.append('uploaded_by', uploadedBy)

  return apiClient.post('/api/psf/scan', formData)
}

export function commitPsfDraft(payload) {
  return apiClient.post('/api/psf/commit', payload)
}
