// lib/constants/request-status.ts
export const RequestStatus = {
  NEW: 'NEW',
  CLAIMED: 'CLAIMED',
  CONTACTED: 'CONTACTED',
  CLOSED: 'CLOSED',
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];
