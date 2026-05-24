import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import {
  approveMaterial,
  deleteAdminMaterial,
  deleteMyUploadedMaterial,
  downloadMaterial,
  getAdminMaterials,
  getArchivedMaterials,
  getApprovedMaterials,
  likeMaterial,
  rejectMaterial,
  restoreMaterial,
  updateAdminMaterial,
  updateMyUploadedMaterial,
  uploadMaterial,
} from './materialsApi'
import { materials } from '../test/fixtures'

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
})
