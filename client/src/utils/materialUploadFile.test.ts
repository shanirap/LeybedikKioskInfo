import { describe, expect, it } from 'vitest'
import {
  formatFileSize,
  isMaterialUploadTooLarge,
  MAX_MATERIAL_UPLOAD_BYTES,
} from './materialUploadFile'

describe('materialUploadFile helpers', () => {
  it('formats file sizes for display', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('detects files larger than the upload limit', () => {
    const withinLimit = new File(['x'], 'worksheet.pdf', { type: 'application/pdf' })
    Object.defineProperty(withinLimit, 'size', { value: MAX_MATERIAL_UPLOAD_BYTES })

    const overLimit = new File(['x'], 'huge.pdf', { type: 'application/pdf' })
    Object.defineProperty(overLimit, 'size', { value: MAX_MATERIAL_UPLOAD_BYTES + 1 })

    expect(isMaterialUploadTooLarge(withinLimit)).toBe(false)
    expect(isMaterialUploadTooLarge(overLimit)).toBe(true)
  })
})
