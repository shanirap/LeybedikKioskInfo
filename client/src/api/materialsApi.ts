import axios, { type AxiosResponse } from 'axios'
import type { MaterialDto, PagedResult, TeacherWalletDto } from '../types/material'
import { apiClient } from './apiClient'
import { getAdminInstruments, getAdminUsers } from './instrumentsApi'

export async function getApprovedMaterials() {
  const { data } = await apiClient.get<MaterialDto[]>('/materials/approved')
  return data
}

export async function getMyUploadedMaterials(params?: { search?: string; page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PagedResult<MaterialDto>>('/materials/my-uploads', { params })
  return data
}

export type TeacherDashboardSummary = {
  approvedAvailableCount: number
  myUploadsCount: number
  pendingCount: number
  rejectedCount: number
}

async function getAllMyUploadedMaterials() {
  const pageSize = 100
  const firstPage = await getMyUploadedMaterials({ page: 1, pageSize })
  const allItems = [...firstPage.items]
  const totalPages = Math.ceil(firstPage.totalCount / pageSize)

  for (let page = 2; page <= totalPages; page++) {
    const result = await getMyUploadedMaterials({ page, pageSize })
    allItems.push(...result.items)
  }

  return { items: allItems, totalCount: firstPage.totalCount }
}

export async function getTeacherDashboardSummary(): Promise<TeacherDashboardSummary> {
  const [approvedMaterials, myUploads] = await Promise.all([
    getApprovedMaterials(),
    getAllMyUploadedMaterials(),
  ])

  return {
    approvedAvailableCount: approvedMaterials.length,
    myUploadsCount: myUploads.totalCount,
    pendingCount: myUploads.items.filter((material) => material.status === 'Pending').length,
    rejectedCount: myUploads.items.filter((material) => material.status === 'Rejected').length,
  }
}

export async function getTeacherWallet() {
  const { data } = await apiClient.get<TeacherWalletDto>('/materials/my-wallet')
  return data
}

export async function getAdminMaterials(params?: {
  status?: MaterialDto['status']
  search?: string
  page?: number
  pageSize?: number
}) {
  const { data } = await apiClient.get<PagedResult<MaterialDto>>('/admin/materials', { params })
  return data
}

export async function getArchivedMaterials(params?: { search?: string; page?: number; pageSize?: number }) {
  const { data } = await apiClient.get<PagedResult<MaterialDto>>('/admin/materials/archived', { params })
  return data
}

export type AdminDashboardSummary = {
  pendingMaterialsCount: number
  approvedMaterialsCount: number
  rejectedMaterialsCount: number
  archivedMaterialsCount: number
  activeTeachersCount: number
  activeInstrumentsCount: number
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const [
    pendingMaterials,
    approvedMaterials,
    rejectedMaterials,
    archivedMaterials,
    users,
    instruments,
  ] = await Promise.all([
    getAdminMaterials({ status: 'Pending', page: 1, pageSize: 1 }),
    getAdminMaterials({ status: 'Approved', page: 1, pageSize: 1 }),
    getAdminMaterials({ status: 'Rejected', page: 1, pageSize: 1 }),
    getArchivedMaterials({ page: 1, pageSize: 1 }),
    getAdminUsers(),
    getAdminInstruments(),
  ])

  return {
    pendingMaterialsCount: pendingMaterials.totalCount,
    approvedMaterialsCount: approvedMaterials.totalCount,
    rejectedMaterialsCount: rejectedMaterials.totalCount,
    archivedMaterialsCount: archivedMaterials.totalCount,
    activeTeachersCount: users.filter((user) => user.role === 'Teacher' && user.isActive).length,
    activeInstrumentsCount: instruments.filter((instrument) => instrument.isActive).length,
  }
}

export async function getMaterialPreviewDetails(id: number) {
  const { data } = await apiClient.get<MaterialDto>(`/materials/${id}`)
  return data
}

export async function approveMaterial(id: number) {
  const { data } = await apiClient.post<MaterialDto>(`/admin/materials/${id}/approve`)
  return data
}

export async function rejectMaterial(id: number, reason?: string) {
  const { data } = await apiClient.post<MaterialDto>(`/admin/materials/${id}/reject`, {
    reason,
  })
  return data
}

export async function restoreMaterial(id: number) {
  const { data } = await apiClient.post<MaterialDto>(`/admin/materials/${id}/restore`)
  return data
}

export async function uploadMaterial(formData: FormData) {
  const { data } = await apiClient.post<MaterialDto>('/materials/upload', formData)
  return data
}

export async function deleteMyUploadedMaterial(id: number) {
  await apiClient.delete(`/materials/my-uploads/${id}`)
}

export async function updateMyUploadedMaterial(id: number, formData: FormData) {
  const { data } = await apiClient.put<MaterialDto>(`/materials/my-uploads/${id}`, formData)
  return data
}

export async function updateAdminMaterial(id: number, formData: FormData) {
  const { data } = await apiClient.put<MaterialDto>(`/admin/materials/${id}`, formData)
  return data
}

export async function deleteAdminMaterial(id: number) {
  await apiClient.delete(`/admin/materials/${id}`)
}

export async function deleteArchivedMaterialPermanently(id: number) {
  await apiClient.delete(`/admin/materials/${id}/permanent`)
}

export async function likeMaterial(id: number) {
  const { data } = await apiClient.post<MaterialDto>(`/materials/${id}/like`)
  return data
}

export async function getFavoriteMaterials() {
  const { data } = await apiClient.get<MaterialDto[]>('/materials/favorites')
  return data
}

export async function addFavoriteMaterial(id: number) {
  const { data } = await apiClient.post<MaterialDto>(`/materials/${id}/favorite`)
  return data
}

export async function removeFavoriteMaterial(id: number) {
  const { data } = await apiClient.delete<MaterialDto>(`/materials/${id}/favorite`)
  return data
}

export async function downloadMaterial(id: number, fileName: string) {
  const blob = await fetchBlob(`/materials/${id}/download`)
  saveBlob(blob, fileName)
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
    const blob = await fetchBlob(`/materials/${id}/preview`)
    openBlob(blob, fileName, previewWindow)
  } catch (err) {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.document.body.textContent = 'לא ניתן לפתוח את הקובץ לצפייה.'
    }
    throw err
  }
}

export async function getMaterialPreviewBlob(id: number) {
  return fetchBlob(`/materials/${id}/preview`)
}

export async function downloadMaterialForReview(id: number, fileName: string) {
  const blob = await fetchBlob(`/admin/materials/${id}/download`)
  saveBlob(blob, fileName)
}

async function fetchBlob(url: string) {
  const response = await apiClient.get<Blob>(url, {
    responseType: 'blob',
    validateStatus: () => true,
  })

  if (response.status >= 400) {
    throw await createBlobRequestError(response)
  }

  const rawContentType = response.headers['content-type']
  const contentType = typeof rawContentType === 'string' ? rawContentType : String(rawContentType ?? '')

  if (contentType.includes('json') || contentType.includes('problem+json')) {
    throw await createBlobRequestError(response)
  }

  return response.data
}

async function createBlobRequestError(response: AxiosResponse<Blob>) {
  let message = 'לא ניתן לטעון את הקובץ.'
  try {
    const text = await response.data.text()
    const parsed = JSON.parse(text) as { message?: string; detail?: string; title?: string }
    message = parsed.message ?? parsed.detail ?? parsed.title ?? message
  } catch {
    // Keep fallback message when the blob body is not JSON.
  }

  return new axios.AxiosError(message, undefined, response.config, response.request, response)
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
