import { z } from 'zod';

export const JobStatusSchema = z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  perPage: number;
}
