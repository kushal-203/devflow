// Shared k6 configuration. Everything is overridable with -e NAME=value (no hard-coded URLs).
export const API_URL = (__ENV.API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
export const USER_EMAIL = __ENV.USER_EMAIL || 'dev@devflow.dev';
export const USER_PASSWORD = __ENV.USER_PASSWORD || 'DevFlow@2026';
export const PROFILE = __ENV.PROFILE || 'smoke';
/** Fraction of iterations that also move a card (write path). 0 = read-only. */
export const WRITE_RATIO = Number(__ENV.WRITE_RATIO || 0.1);

/** Load profiles: smoke (sanity, CI), load (expected peak), stress (find the breaking point). */
export const PROFILES = {
  smoke: { vus: 2, duration: '30s' },
  load: {
    stages: [
      { duration: '30s', target: 20 },
      { duration: '2m', target: 20 },
      { duration: '30s', target: 0 },
    ],
  },
  stress: {
    stages: [
      { duration: '1m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '1m', target: 0 },
    ],
  },
};

/** Service-level objectives. A breached threshold makes k6 exit non-zero (fails CI). */
export const THRESHOLDS = {
  http_req_failed: ['rate<0.01'],                         // < 1 % errors
  'http_req_duration{endpoint:board}': ['p(95)<500', 'p(99)<1000'],
  'http_req_duration{endpoint:issues}': ['p(95)<500'],
  'http_req_duration{endpoint:transition}': ['p(95)<800'],
  checks: ['rate>0.99'],
};
