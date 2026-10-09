/**
 * k6 load test for the sprint board – the busiest screen in DevFlow.
 *
 *   k6 run -e PROFILE=smoke packages/performance/scripts/sprint-board.js
 *   k6 run -e PROFILE=load  -e API_URL=https://staging.example.com/api packages/performance/scripts/sprint-board.js
 *
 * Each virtual user behaves like someone working the board: loads the board, opens the issue list
 * and the sprint list, sometimes drags a card one column right (and back), then thinks for 1–3 s.
 */
import http from 'k6/http';
import { check, fail, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { API_URL, PROFILE, PROFILES, THRESHOLDS, USER_EMAIL, USER_PASSWORD, WRITE_RATIO } from '../lib/config.js';

const boardIssues = new Trend('board_issue_count');
const transitions = new Counter('card_moves');

export const options = {
  ...(PROFILES[PROFILE] || PROFILES.smoke),
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  tags: { profile: PROFILE },
};

const NEXT = { BACKLOG: 'IN_PROGRESS', IN_PROGRESS: 'QA', QA: 'IN_PROGRESS' };

/** Runs once: authenticate and discover the boards to hit. */
export function setup() {
  const health = http.get(`${API_URL}/health`);
  if (health.status !== 200) fail(`API not healthy at ${API_URL} (status ${health.status})`);

  const login = http.post(`${API_URL}/auth/login`, JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'login' },
  });
  if (login.status !== 200) fail(`Login failed for ${USER_EMAIL}: ${login.status} ${login.body}`);
  const token = login.json('token');
  const auth = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  const projects = http.get(`${API_URL}/projects`, auth).json('data');
  if (!projects || projects.length === 0) fail('No projects found – seed the database first (npm run db:seed)');
  return { token, projectIds: projects.map((p) => p.id) };
}

export default function (data) {
  const params = (endpoint) => ({ headers: { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json' }, tags: { endpoint } });
  const projectId = data.projectIds[Math.floor(Math.random() * data.projectIds.length)];
  let board;

  group('open sprint board', () => {
    const res = http.get(`${API_URL}/projects/${projectId}/board`, params('board'));
    const ok = check(res, {
      'board: status 200': (r) => r.status === 200,
      'board: 5 workflow columns': (r) => (r.json('data.columns') || []).length === 5,
    });
    if (ok) {
      board = res.json('data');
      boardIssues.add(board.totalIssues);
    }
  });

  group('load issue list and sprints', () => {
    const issues = http.get(`${API_URL}/issues?projectId=${projectId}&pageSize=20`, params('issues'));
    check(issues, { 'issues: status 200': (r) => r.status === 200, 'issues: has pagination': (r) => r.json('pagination.page') === 1 });
    const sprints = http.get(`${API_URL}/projects/${projectId}/sprints`, params('sprints'));
    check(sprints, { 'sprints: status 200': (r) => r.status === 200 });
  });

  if (board && Math.random() < WRITE_RATIO) {
    group('drag a card', () => {
      const movable = board.columns.flatMap((c) => c.issues).filter((i) => NEXT[i.status]);
      if (movable.length === 0) return;
      const issue = movable[Math.floor(Math.random() * movable.length)];
      // 409 is not counted in http_req_failed: it is the correct answer to a concurrent move.
      const moveParams = { ...params('transition'), responseCallback: http.expectedStatuses(200, 409) };
      const move = (to) => http.post(`${API_URL}/issues/${issue.id}/transition`, JSON.stringify({ toStatus: to }), moveParams);
      const forward = move(NEXT[issue.status]);
      check(forward, { 'move: 200 or 409 (concurrent move)': (r) => r.status === 200 || r.status === 409 });
      if (forward.status === 200) {
        transitions.add(1);
        move(issue.status); // put it back so the data set stays stable across runs
      }
    });
  }

  sleep(1 + Math.random() * 2);
}
