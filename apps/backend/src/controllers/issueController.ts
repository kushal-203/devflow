import type { Request, Response } from 'express';
import { currentUser } from '../middleware/auth.js';
import { valid } from '../middleware/validate.js';
import type { CreateIssueBody, ListIssuesQuery, TransitionBody, UpdateIssueBody } from '../schemas/issue.js';
import * as issues from '../services/issueService.js';

type Id = { id: string };

export const list = async (req: Request, res: Response) => res.json(await issues.listIssues(valid<ListIssuesQuery>(res, 'query')));
export const get = async (req: Request, res: Response) => res.json({ data: await issues.getIssue(valid<Id>(res, 'params').id, currentUser(res)) });

export async function create(req: Request, res: Response) {
  const issue = await issues.createIssue(valid<CreateIssueBody>(res, 'body'), currentUser(res));
  res.status(201).location(`/api/issues/${issue.id}`).json({ data: issue });
}

export const update = async (req: Request, res: Response) =>
  res.json({ data: await issues.updateIssue(valid<Id>(res, 'params').id, valid<UpdateIssueBody>(res, 'body'), currentUser(res)) });

export async function remove(req: Request, res: Response) {
  await issues.deleteIssue(valid<Id>(res, 'params').id, currentUser(res));
  res.status(204).end();
}

export async function transition(req: Request, res: Response) {
  const { toStatus, index } = valid<TransitionBody>(res, 'body');
  res.json({ data: await issues.transitionIssue(valid<Id>(res, 'params').id, toStatus, index, currentUser(res)) });
}

export const events = async (req: Request, res: Response) => res.json({ data: await issues.listEvents(valid<Id>(res, 'params').id) });
export const testCases = async (req: Request, res: Response) => res.json({ data: await issues.listTestCases(valid<Id>(res, 'params').id) });
export const triage = async (req: Request, res: Response) =>
  res.json({ data: await issues.triageIssue(valid<Id>(res, 'params').id, valid(res, 'body'), currentUser(res)) });
export const dashboard = async (req: Request, res: Response) => res.json({ data: await issues.dashboardStats() });
