import type { Response } from "express";

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: { page?: number; limit?: number; total?: number };
}

interface ApiErrorResponse {
  success: false;
  error: { message: string; code?: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function apiResponse<T>(
  res: Response,
  data: T,
  meta?: { page?: number; limit?: number; total?: number },
  status = 200,
) {
  return res.status(status).json({ success: true, data, meta });
}

export function apiError(
  res: Response,
  status: number,
  message: string,
  code?: string,
  details?: unknown,
) {
  return res.status(status).json({ success: false, error: { message, code, details } });
}

export function apiPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return apiResponse(res, data, { page, limit, total });
}
