import { buildContext } from '../lib/context.js';
import { json, error } from '../lib/response.js';

export async function onRequestGet(cfContext) {
  const ctx = await buildContext(cfContext);
  if (ctx.error) return error(ctx.error, 404);
  const theme = ctx.host.theme;
  if (typeof theme === 'object') return json(theme);
  return json({ name: theme });
}
