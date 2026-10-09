import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { authenticate, requireRole, requireWriter } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { LoginBody } from '../schemas/auth.js';
import { IdParams, ProjectIdParams } from '../schemas/common.js';
import { BoardQuery, CreateProjectBody, UpdateProjectBody } from '../schemas/project.js';
import { CreateSprintBody, UpdateSprintBody } from '../schemas/sprint.js';
import { ApplyTriageBody, CreateIssueBody, ListIssuesQuery, TransitionBody, UpdateIssueBody } from '../schemas/issue.js';
import { TriageRequestBody } from '../schemas/ai.js';
import * as authC from '../controllers/authController.js';
import * as projectC from '../controllers/projectController.js';
import * as issueC from '../controllers/issueController.js';
import * as aiC from '../controllers/aiController.js';
import { seedDatabase } from '../db/seed.js';

export const router = Router();
const noQuery = validate('query', BoardQuery.pick({}).strict());

// ---------- public ----------
router.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', database: 'ok', aiProvider: env.AI_PROVIDER });
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: env.LOGIN_RATE_LIMIT, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts, try again later' } } });
router.post('/auth/login', loginLimiter, validate('body', LoginBody), authC.login);
router.post('/auth/logout', authC.logout);

// ---------- everything below requires a valid session ----------
router.use(authenticate);
router.get('/auth/me', authC.me);
router.get('/users', async (req, res) => {
  res.json({ data: await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }) });
});
router.get('/dashboard', issueC.dashboard);

// Projects & board
router.get('/projects', noQuery, projectC.list);
router.post('/projects', requireRole('ADMIN'), validate('body', CreateProjectBody), projectC.create);
router.get('/projects/:projectId', validate('params', ProjectIdParams), projectC.get);
router.patch('/projects/:projectId', requireRole('ADMIN'), validate('params', ProjectIdParams), validate('body', UpdateProjectBody), projectC.update);
router.delete('/projects/:projectId', requireRole('ADMIN'), validate('params', ProjectIdParams), projectC.remove);
router.get('/projects/:projectId/board', validate('params', ProjectIdParams), validate('query', BoardQuery), projectC.board);

// Sprints
router.get('/projects/:projectId/sprints', validate('params', ProjectIdParams), projectC.listSprints);
router.post('/projects/:projectId/sprints', requireRole('ADMIN', 'QA'), validate('params', ProjectIdParams), validate('body', CreateSprintBody), projectC.createSprint);
router.patch('/sprints/:id', requireRole('ADMIN', 'QA'), validate('params', IdParams), validate('body', UpdateSprintBody), projectC.updateSprint);
router.delete('/sprints/:id', requireRole('ADMIN'), validate('params', IdParams), projectC.deleteSprint);

// Issues
router.get('/issues', validate('query', ListIssuesQuery), issueC.list);
router.post('/issues', requireWriter, validate('body', CreateIssueBody), issueC.create);
router.get('/issues/:id', validate('params', IdParams), issueC.get);
router.patch('/issues/:id', requireWriter, validate('params', IdParams), validate('body', UpdateIssueBody), issueC.update);
router.delete('/issues/:id', requireWriter, validate('params', IdParams), issueC.remove);
router.post('/issues/:id/transition', validate('params', IdParams), validate('body', TransitionBody), issueC.transition); // role rules live in the workflow
router.get('/issues/:id/events', validate('params', IdParams), issueC.events);
router.get('/issues/:id/test-cases', validate('params', IdParams), issueC.testCases);
router.post('/issues/:id/triage', requireWriter, validate('params', IdParams), validate('body', ApplyTriageBody), issueC.triage);

// AI
router.post('/ai/triage', requireWriter, validate('body', TriageRequestBody), aiC.triageBug);

// ---------- test support (never enabled in production) ----------
export const testRouter = Router();
testRouter.post('/reset', async (req, res) => {
  res.json({ status: 'reset', ...(await seedDatabase(prisma)) });
});
