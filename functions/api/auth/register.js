import { createToken, hashPassword, json } from '../../_lib/auth.js';

export const onRequestPost = async ({ request, env }) => {
  try {
    const { username, password } = await request.json();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username || '')) {
      return json({ error: 'Username must be 3–30 letters, numbers, or underscores.' }, 400);
    }
    if (typeof password !== 'string' || password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) return json({ error: 'Username already taken' }, 409);
    const passwordHash = await hashPassword(password);
    const result = await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .bind(username, passwordHash).run();
    const token = await createToken({ id: result.meta.last_row_id, username }, env.JWT_SECRET);
    return json({ message: 'User created successfully', token, user: { username } }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};
