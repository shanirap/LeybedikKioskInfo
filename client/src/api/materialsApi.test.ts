import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from './apiClient'
import {
  approveMaterial,
  downloadMaterial,
  getAdminMaterials,
  getApprovedMaterials,
  likeMaterial,
  rejectMaterial,
  uploadMaterial,
} from './materialsApi'
import { materials } from '../test/fixtures'

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('materials API helpers', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.post).mockReset()
  })

  it('loads teacher and admin material lists from the expected endpoints', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: materials })

    await expect(getApprovedMaterials()).resolves.toBe(materials)
    await expect(getAdminMaterials('Pending')).resolves.toBe(materials)

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/materials/approved')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/admin/materials', {
      params: { status: 'Pending' },
    })
  })

  it('posts material actions to the expected endpoints', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: materials[0] })
    const formData = new FormData()

    await uploadMaterial(formData)
    await approveMaterial(1)
    await rejectMaterial(1)
    await likeMaterial(1)

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/materials/upload', formData)
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/admin/materials/1/approve')
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/admin/materials/1/reject')
    expect(apiClient.post).toHaveBeenNthCalledWith(4, '/materials/1/like')
  })

  it('downloads a blob through a temporary link', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    vi.mocked(apiClient.get).mockResolvedValue({ data: blob })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await downloadMaterial(1, 'rhythm.pdf')

    expect(apiClient.get).toHaveBeenCalledWith('/materials/1/download', {
      responseType: 'blob',
    })
    expect(click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
