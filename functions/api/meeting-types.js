import { buildContext } from '../lib/context.js';
import { json, error } from '../lib/response.js';

export async function onRequestGet(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);
  return json({ types: ctx.host.meeting_types });
}
