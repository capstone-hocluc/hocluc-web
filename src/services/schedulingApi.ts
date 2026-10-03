import { request, type ApiResponse, type RequestOptions } from '../lib/api'

export async function requestSchedulingData<T>(
  path: string,
  options: RequestOptions,
  message: string
): Promise<T> {
  const response: ApiResponse<T> = await request<T>(path, options)
  if (response.data === undefined || response.data === null) throw new Error(message)
  return response.data
}

export function schedulingQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, value)
  }
  const query = params.toString()
  return query ? '?' + query : ''
}
