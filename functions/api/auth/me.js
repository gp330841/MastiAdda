import { json, readToken } from '../../_lib/auth.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    const token = await readToken(request, env.JWT_SECRET);
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const user = await env.DB.prepare('SELECT username, created_at FROM users WHERE id = ?')
      .bind(token.id).first();
    return user ? json({ user }) : json({ error: 'User not found' }, 404);
  } catch (error) {
    console.error('Profile error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};
