import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';

const [id, username] = process.argv.slice(2);
assert.match(id || '', /^[0-9a-f-]{36}$/);
assert.match(username || '', /^deploy_smoke_[0-9a-f]{12}$/);
const db = new DatabaseSync('/opt/shanhe-footprint-map/.task-tmp/local-data/atlas.sqlite');
db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
try {
  const account = db.prepare('SELECT display_name FROM auth_accounts WHERE id=? AND username=?').get(id, username);
  assert.equal(account?.display_name, '部署验收临时账号');
  for (const [table, column] of [['posts', 'author_id'], ['comments', 'author_id'], ['friendships', 'sender_id'], ['friendships', 'receiver_id']]) {
    assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${column}=?`).get(id).n, 0, 'Test content must be cleaned through the API first');
  }
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  assert.equal(db.prepare('DELETE FROM auth_accounts WHERE id=? AND username=?').run(id, username).changes, 1);
  db.exec('COMMIT');
  console.log('PASS: only the identified deployment smoke-test account removed');
} catch (error) { db.exec('ROLLBACK'); throw error; }
finally { db.close(); }
