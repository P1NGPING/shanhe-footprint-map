import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const [phase, origin] = process.argv.slice(2);
assert.ok(['create', 'verify', 'cleanup'].includes(phase) && origin, 'Usage: node smoke.mjs create|verify|cleanup http://SERVER');
const file = new URL('../../.task-tmp/vps-smoke.json', import.meta.url);
const png = new Uint8Array([137,80,78,71,13,10,26,10,0,1]);
let session;
async function request(path, { body, form, method = body || form ? 'POST' : 'GET', cookie = session?.cookie, expected = 200 } = {}) {
  const headers = { origin };
  if (cookie) headers.cookie = cookie;
  if (body) headers['content-type'] = 'application/json';
  const response = await fetch(origin + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  assert.equal(response.status, expected, `${method} ${path}: ${response.status}`);
  return response;
}
if (phase === 'create') {
  const username = 'deploy_smoke_' + randomUUID().replaceAll('-', '').slice(0, 12);
  const password = randomUUID() + randomUUID();
  const registered = await request('/api/auth/register', { body: { username, password, name: '部署验收临时账号' }, expected: 201 });
  const cookie = registered.headers.get('set-cookie').split(';')[0];
  session = { username, password, cookie };
  session.userId = (await (await request('/api/me')).json()).user.id;
  session.state = { layers: [{ id: 'visited', name: '部署验收', color: '#218374', visible: true, visited: true, codes: ['320500'] }], activeLayerId: 'visited', background: '#eaf1ef' };
  await request('/api/state', { method: 'PUT', body: { state: session.state, revision: 0 } });
  const form = new FormData();
  form.set('city', '320500'); form.set('visibility', 'friends'); form.set('text', '临时部署验收记录');
  form.append('photo', new Blob([png], { type: 'image/png' }), 'smoke.png');
  session.post = (await (await request('/api/posts', { form, expected: 201 })).json()).post;
  await mkdir(new URL('../../.task-tmp/', import.meta.url), { recursive: true });
  await writeFile(file, JSON.stringify(session), { mode: 0o600 });
  console.log('PASS: external registration, map save, private photo upload');
} else {
  session = JSON.parse(await readFile(file, 'utf8'));
  if (phase === 'verify') {
    const me = await (await request('/api/me')).json();
    assert.equal(me.user.id, session.userId);
    assert.deepEqual(me.state, session.state);
    const photo = await request(session.post.photoUrl);
    assert.equal(photo.headers.get('content-type'), 'image/png');
    assert.deepEqual(new Uint8Array(await photo.arrayBuffer()), png);
    await request(session.post.photoUrl, { cookie: '', expected: 404 });
    const login = await request('/api/auth/login', { body: { username: session.username, password: session.password } });
    const loginCookie = login.headers.get('set-cookie').split(';')[0];
    await request('/api/me', { cookie: loginCookie });
    await request('/api/auth/logout', { cookie: loginCookie, method: 'POST' });
    console.log('PASS: original session, password, map and photo survive service restart; private photo protected');
  } else {
    await request('/api/posts/' + session.post.id, { method: 'DELETE' });
    await request('/api/auth/logout', { method: 'POST' });
    console.log('PASS: temporary photo/post removed and session revoked');
  }
}
