import { setTimeout } from 'node:timers/promises';
import { request } from 'node:http';

const host = new URL(process.env.PUBLIC_ORIGIN).host;
const url = `http://127.0.0.1:${process.env.PORT || 4317}/api/auth/status`;
let ready = false;
for (let attempt = 0; attempt < 50; attempt++) {
  try {
    ready = await new Promise((accept, reject) => {
      const req = request(url, { headers: { host, connection: 'close' }, timeout: 1000 }, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
          try { accept(response.statusCode === 200 && JSON.parse(body).configured === true); }
          catch { accept(false); }
        });
      });
      req.on('timeout', () => req.destroy(new Error('Readiness timeout')));
      req.on('error', reject);
      req.end();
    });
    if (ready) break;
  } catch {}
  await setTimeout(100);
}
if (!ready) throw new Error('Shanhe HTTP readiness check failed');
console.log('Shanhe HTTP service ready');
