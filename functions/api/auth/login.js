import { createToken, json, verifyPassword } from '../../_lib/auth.js';

export const onRequestPost = async ({ request, env }) => {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return json({ error: 'Username and password are required' }, 400);
    const user = await env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
      .bind(username).first();
    if (!user || !await verifyPassword(password, user.password_hash)) {
      return json({ error: 'Incorrect username or password' }, 401);
    }
    const token = await createToken({ id: user.id, username: user.username }, env.JWT_SECRET);
    return json({ message: 'Login successful', token, user: { username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};
