import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

test('browser UUID generation works on HTTP without crypto.randomUUID', () => {
  const source = readFileSync(new URL('../web/uuid.js', import.meta.url), 'utf8').replace('export function', 'function');
  const uuid = runInNewContext(source + '\nuuid', { crypto: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) } });
  const values = Array.from({ length: 100 }, () => uuid());
  assert.equal(new Set(values).size, 100);
  for (const value of values) assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
