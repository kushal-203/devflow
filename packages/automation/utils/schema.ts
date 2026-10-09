import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { expect } from '@playwright/test';
import issueSchema from '../schemas/issue.schema.json';
import errorSchema from '../schemas/error.schema.json';
import boardSchema from '../schemas/board.schema.json';
import triageSchema from '../schemas/triage.schema.json';

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(issueSchema).addSchema(errorSchema).addSchema(boardSchema).addSchema(triageSchema);

export type SchemaId = 'issue' | 'error' | 'board' | 'triage';

/** Asserts that `data` matches the JSON Schema contract, with readable error output on failure. */
export function expectToMatchSchema(data: unknown, id: SchemaId) {
  const validate = ajv.getSchema(`https://devflow.dev/schemas/${id}.json`);
  if (!validate) throw new Error(`Unknown schema ${id}`);
  const ok = validate(data);
  const problems = (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message}${e.params ? ` ${JSON.stringify(e.params)}` : ''}`);
  expect(ok, `Response does not match the "${id}" contract:\n${problems.join('\n')}`).toBe(true);
}
