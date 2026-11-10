// lib/constants/request-status.ts
export const RequestStatus = {
  NEW: 'NEW',
  CLAIMED: 'CLAIMED',
  CONTACTED: 'CONTACTED',
  BOOKED: 'BOOKED',
  CLOSED: 'CLOSED',
} as const;

/** French labels, in the order a request moves through (AN-3). CLAIMED is legacy and no longer offered. */
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  NEW: 'Nouvelle',
  CLAIMED: 'Prise en charge',
  CONTACTED: 'Voyageur rappelé',
  BOOKED: 'Réservée (billet émis)',
  CLOSED: 'Sans suite',
};
export const REQUEST_STATUS_CHOICES = ['NEW', 'CONTACTED', 'BOOKED', 'CLOSED'] as const;
export const REQUEST_STATUS_VARIANT = {
  NEW: 'info',
  CLAIMED: 'warning',
  CONTACTED: 'warning',
  BOOKED: 'success',
  CLOSED: 'neutral',
} as const satisfies Record<RequestStatus, string>;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];
