const encoder = new TextEncoder();

const base64UrlEncode = (value) => {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const hmacKey = (secret) => crypto.subtle.importKey(
  'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
);

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return base64UrlEncode(bytes);
};

export const hashPassword = async (password, salt = randomToken()) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100_000 }, key, 256,
  );
  return `${salt}:${base64UrlEncode(new Uint8Array(bits))}`;
};

export const verifyPassword = async (password, storedHash) => {
  const [salt] = storedHash.split(':');
  if (!salt) return false;
  const attempt = await hashPassword(password, salt);
  const a = encoder.encode(attempt);
  const b = encoder.encode(storedHash);
  if (a.length !== b.length) return false;
  let result = 0;
  a.forEach((byte, index) => { result |= byte ^ b[index]; });
  return result === 0;
};

export const createToken = async (payload, secret) => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86_400 }));
  const data = `${header}.${body}`;
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(data)));
  return `${data}.${base64UrlEncode(signature)}`;
};

export const readToken = async (request, secret) => {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), base64UrlDecode(signature), encoder.encode(`${header}.${body}`));
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
};

export const json = (data, status = 200) => Response.json(data, { status });
