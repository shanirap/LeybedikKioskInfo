import type { MaterialDto } from '../types/material'
import { apiClient } from './apiClient'

export async function getApprovedMaterials() {
  const { data } = await apiClient.get<MaterialDto[]>('/materials/approved')
  return data
}

export async function getMyUploadedMaterials() {
  const { data } = await apiClient.get<MaterialDto[]>('/materials/my-uploads')
  return data
}

export async function getPendingMaterials() {
  const { data } = await apiClient.get<MaterialDto[]>('/admin/materials/pending')
  return data
}

export async function getAdminMaterials(status?: MaterialDto['status']) {
  const { data } = await apiClient.get<MaterialDto[]>('/admin/materials', {
    params: status ? { status } : undefined,
  })
  return data
}

export async function approveMaterial(id: number) {
  const { data } = await apiClient.post<MaterialDto>(`/admin/materials/${id}/approve`)
  return data
}

export async function rejectMaterial(id: number) {
  const { data } = await apiClient.post<MaterialDto>(`/admin/materials/${id}/reject`)
  return data
}

export async function uploadMaterial(formData: FormData) {
  const { data } = await apiClient.post<MaterialDto>('/materials/upload', formData)
  return data
}

export async function likeMaterial(id: number) {
  const { data } = await apiClient.post<MaterialDto>(`/materials/${id}/like`)
  return data
}

export async function downloadMaterial(id: number, fileName: string) {
  const { data } = await apiClient.get<Blob>(`/materials/${id}/download`, {
    responseType: 'blob',
  })

  saveBlob(data, fileName)
}

export async function previewMaterial(id: number, fileName: string) {
  const previewWindow = window.open('', '_blank')
  if (previewWindow) {
    previewWindow.opener = null
    previewWindow.document.title = fileName
    previewWindow.document.body.dir = 'rtl'
    previewWindow.document.body.textContent = 'טוען תצוגה מקדימה...'
  }

  try {
    const { data } = await apiClient.get<Blob>(`/materials/${id}/preview`, {
      responseType: 'blob',
    })

    openBlob(data, fileName, previewWindow)
  } catch (err) {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.document.body.textContent = 'לא ניתן לפתוח את הקובץ לצפייה.'
    }
    throw err
  }
}

export async function downloadMaterialForReview(id: number, fileName: string) {
  const { data } = await apiClient.get<Blob>(`/admin/materials/${id}/download`, {
    responseType: 'blob',
  })

  saveBlob(data, fileName)
}

function saveBlob(data: Blob, fileName: string) {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function openBlob(data: Blob, fileName: string, previewWindow?: Window | null) {
  const url = URL.createObjectURL(data)
  if (previewWindow) {
    previewWindow.location.href = url
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return
  }

  const openedWindow = window.open(url, '_blank', 'noopener,noreferrer')

  if (!openedWindow) {
    saveBlob(data, fileName)
    return
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
