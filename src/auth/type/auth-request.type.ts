

import type { Request } from 'express';

export interface AuthRequest extends Request {
  user: {
    sub: string;          // JWT subject (same as userId)
    userId: string;       // 👈 add this so TS knows it exists
    tenantId: string;
    email?: string;
    username?: string;
    role?: string;
    hasBlog?: boolean;
  };
}
