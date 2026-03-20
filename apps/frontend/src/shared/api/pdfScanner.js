import { apiClient } from './client.js'

export function scanPdfFile(file, uploadedBy = null) {
  const formData = new FormData()
  formData.append('pdf', file)
  if (uploadedBy) formData.append('uploaded_by', uploadedBy)

  return apiClient.post('/api/pdf/scan', formData)
}

export function commitPdfDraft(payload) {
  return apiClient.post('/api/pdf/commit', payload)
}
