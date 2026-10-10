import { request } from '../lib/api'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  parentId: string | null
  active: boolean
  sortOrder: number
  updatedAt: string
}

export interface SaveCategoryRequest {
  name: string
  slug?: string
  description?: string | null
  imageUrl?: string | null
  parentId: string | null
  active: boolean
  sortOrder: number
  expectedUpdatedAt?: string
}

export async function getCategories(): Promise<Category[]> {
  const response = await request<Category[]>('/api/v1/categories', { auth: true })
  if (!response.data) throw new Error('Không thể tải danh mục.')
  return response.data
}

export async function saveCategory(
  id: string | null,
  body: SaveCategoryRequest
): Promise<Category> {
  const response = await request<Category>(
    `/api/v1/categories${id ? `/${encodeURIComponent(id)}` : ''}`,
    {
      auth: true,
      method: id ? 'PUT' : 'POST',
      body,
    }
  )
  if (!response.data) throw new Error('Không nhận được danh mục đã lưu.')
  return response.data
}

export async function deleteCategory(id: string): Promise<void> {
  await request<void>(`/api/v1/categories/${encodeURIComponent(id)}`, {
    auth: true,
    method: 'DELETE',
  })
}
