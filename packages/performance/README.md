# DevFlow performance tests (k6)

Load tests for the sprint board endpoints (`GET /projects/:id/board`, `GET /issues`, `GET /projects/:id/sprints`
and, optionally, `POST /issues/:id/transition`).

## Install k6
- Windows: `winget install k6 --source winget`
- macOS: `brew install k6`
- Linux / other: https://grafana.com/docs/k6/latest/set-up/install-k6/

## Run (API must be running and seeded)
```bash
npm run perf:smoke            # 2 VUs for 30 s – sanity check, used in CI
npm run perf:load             # ramp to 20 VUs, hold 2 min
k6 run -e PROFILE=stress packages/performance/scripts/sprint-board.js
k6 run -e API_URL=https://staging.example.com/api -e USER_EMAIL=... -e USER_PASSWORD=... packages/performance/scripts/sprint-board.js
```
`WRITE_RATIO` (default `0.1`) controls how often a virtual user also drags a card (and moves it back).

## Thresholds (SLOs)
| Metric | Threshold |
|---|---|
| Error rate (`http_req_failed`) | < 1 % |
| Board `p(95)` / `p(99)` | < 500 ms / < 1000 ms |
| Issue list `p(95)` | < 500 ms |
| Card move `p(95)` | < 800 ms |
| Checks passing | > 99 % |

A breached threshold makes k6 exit with a non-zero code, so CI fails. The machine-readable summary is written to
`packages/performance/results/summary.json` (`--summary-export`).
