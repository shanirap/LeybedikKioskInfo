import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import {
  approveMaterial,
  deleteAdminMaterial,
  deleteMyUploadedMaterial,
  downloadMaterial,
  downloadMaterialForReview,
  getAdminMaterials,
  getArchivedMaterials,
  getApprovedMaterials,
  getMaterialPreviewBlob,
  getMaterialPreviewDetails,
  getMyUploadedMaterials,
  getTeacherWallet,
  likeMaterial,
  previewMaterial,
  rejectMaterial,
  restoreMaterial,
  updateAdminMaterial,
  updateMyUploadedMaterial,
  uploadMaterial,
} from './materialsApi'
import { materials, pagedMaterials } from '../test/fixtures'

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

describe('materials API helpers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.delete).mockReset()
    vi.mocked(apiClient.post).mockReset()
    vi.mocked(apiClient.put).mockReset()
  })

  it('loads teacher and admin material lists from the expected endpoints', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: materials })

    await expect(getApprovedMaterials()).resolves.toBe(materials)
    await expect(getAdminMaterials({ status: 'Pending' })).resolves.toBe(materials)
    await expect(getArchivedMaterials()).resolves.toBe(materials)

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/materials/approved')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/admin/materials', {
      params: { status: 'Pending' },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/admin/materials/archived', { params: undefined })
  })

  it('loads uploads, preview details, and teacher wallet from the expected endpoints', async () => {
    const wallet = {
      totalLikes: 4,
      totalUniqueDownloads: 2,
      totalMaterials: 1,
      materials: [],
    }
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: pagedMaterials() })
      .mockResolvedValueOnce({ data: materials[0] })
      .mockResolvedValueOnce({ data: wallet })

    await expect(getMyUploadedMaterials({ search: 'piano' })).resolves.toEqual(pagedMaterials())
    await expect(getMaterialPreviewDetails(1)).resolves.toBe(materials[0])
    await expect(getTeacherWallet()).resolves.toBe(wallet)

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/materials/my-uploads', {
      params: { search: 'piano' },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/materials/1')
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/materials/my-wallet')
  })

  it('posts material actions to the expected endpoints', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: materials[0] })
    const formData = new FormData()

    await uploadMaterial(formData)
    await approveMaterial(1)
    await rejectMaterial(1, 'Needs work')
    await restoreMaterial(1)
    await likeMaterial(1)

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/materials/upload', formData)
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/admin/materials/1/approve')
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/admin/materials/1/reject', {
      reason: 'Needs work',
    })
    expect(apiClient.post).toHaveBeenNthCalledWith(4, '/admin/materials/1/restore')
    expect(apiClient.post).toHaveBeenNthCalledWith(5, '/materials/1/like')
  })

  it('updates my uploaded materials through the expected endpoint', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: materials[1] })
    const formData = new FormData()

    await expect(updateMyUploadedMaterial(2, formData)).resolves.toBe(materials[1])

    expect(apiClient.put).toHaveBeenCalledWith('/materials/my-uploads/2', formData)
  })

  it('updates admin materials through the expected endpoint', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: materials[1] })
    const formData = new FormData()

    await expect(updateAdminMaterial(3, formData)).resolves.toBe(materials[1])

    expect(apiClient.put).toHaveBeenCalledWith('/admin/materials/3', formData)
  })

  it('deletes materials through the expected endpoints', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({})

    await deleteMyUploadedMaterial(1)
    await deleteAdminMaterial(2)

    expect(apiClient.delete).toHaveBeenNthCalledWith(1, '/materials/my-uploads/1')
    expect(apiClient.delete).toHaveBeenNthCalledWith(2, '/admin/materials/2')
  })

  it('downloads a blob through a temporary link', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: blob,
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await downloadMaterial(1, 'rhythm.pdf')

    expect(apiClient.get).toHaveBeenCalledWith('/materials/1/download', {
      responseType: 'blob',
      validateStatus: expect.any(Function),
    })
    expect(click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('loads preview blobs from the preview endpoint', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: blob,
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    })

    await expect(getMaterialPreviewBlob(1)).resolves.toBe(blob)

    expect(apiClient.get).toHaveBeenCalledWith('/materials/1/preview', {
      responseType: 'blob',
      validateStatus: expect.any(Function),
    })
  })

  it('downloads admin review files through a temporary link', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: blob,
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:review')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await downloadMaterialForReview(2, 'strings.pdf')

    expect(apiClient.get).toHaveBeenCalledWith('/admin/materials/2/download', {
      responseType: 'blob',
      validateStatus: expect.any(Function),
    })
    expect(click).toHaveBeenCalled()
  })

  it('opens preview files in a new window', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: blob,
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    })
    const previewWindow = {
      opener: {},
      closed: false,
      document: {
        title: '',
        body: { dir: '', textContent: '' },
      },
      location: { href: '' },
    }
    vi.spyOn(window, 'open').mockReturnValue(previewWindow as unknown as Window)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')

    await previewMaterial(1, 'rhythm.pdf')

    expect(window.open).toHaveBeenCalledWith('', '_blank')
    expect(previewWindow.location.href).toBe('blob:preview')
    expect(previewWindow.document.body.textContent).toBe('טוען תצוגה מקדימה...')
  })

  it('throws when blob requests return an error payload', async () => {
    const errorBlob = new Blob([JSON.stringify({ message: 'File not found.' })], {
      type: 'application/json',
    })
    vi.mocked(apiClient.get).mockResolvedValue({
      data: errorBlob,
      status: 404,
      headers: { 'content-type': 'application/json' },
      config: {},
      request: {},
    })

    await expect(getMaterialPreviewBlob(99)).rejects.toMatchObject({
      message: 'File not found.',
    })
  })
})
