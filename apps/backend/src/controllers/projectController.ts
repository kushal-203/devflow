import type { Request, Response } from 'express';
import { valid } from '../middleware/validate.js';
import * as projects from '../services/projectService.js';
import * as sprints from '../services/sprintService.js';

type P = { projectId: string };

export const list = async (req: Request, res: Response) => res.json({ data: await projects.listProjects() });
export const get = async (req: Request, res: Response) => res.json({ data: await projects.getProject(valid<P>(res, 'params').projectId) });
export const create = async (req: Request, res: Response) => res.status(201).json({ data: await projects.createProject(valid(res, 'body')) });
export const update = async (req: Request, res: Response) => res.json({ data: await projects.updateProject(valid<P>(res, 'params').projectId, valid(res, 'body')) });
export const remove = async (req: Request, res: Response) => { await projects.deleteProject(valid<P>(res, 'params').projectId); res.status(204).end(); };
export const board = async (req: Request, res: Response) =>
  res.json({ data: await projects.getBoard(valid<P>(res, 'params').projectId, valid<{ sprintId?: string }>(res, 'query').sprintId) });

export const listSprints = async (req: Request, res: Response) => res.json({ data: await sprints.listSprints(valid<P>(res, 'params').projectId) });
export const createSprint = async (req: Request, res: Response) =>
  res.status(201).json({ data: await sprints.createSprint(valid<P>(res, 'params').projectId, valid(res, 'body')) });
export const updateSprint = async (req: Request, res: Response) => res.json({ data: await sprints.updateSprint(valid<{ id: string }>(res, 'params').id, valid(res, 'body')) });
export const deleteSprint = async (req: Request, res: Response) => { await sprints.deleteSprint(valid<{ id: string }>(res, 'params').id); res.status(204).end(); };
