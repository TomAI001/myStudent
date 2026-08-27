import fs from 'node:fs';
import path from 'node:path';

const deploy = 'D:/工作/myStudent_publish/deploy/assets';
const stage = 'D:/工作/myStudent_publish/teacher-courseware-cachebust/assets';
const oldAdmin = 'AdminDashboard-B5JuzPiq.js';
const newAdmin = 'AdminDashboard-L3-7230fd9.js';
const indexName = 'index-C1ZxpkkS.js';

fs.rmSync(path.dirname(stage), { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

const admin = fs.readFileSync(path.join(deploy, oldAdmin), 'utf8');
if (!admin.includes('builtin-python-lesson-3')) throw new Error('lesson 3 entry missing');
fs.writeFileSync(path.join(stage, newAdmin), admin);

let index = fs.readFileSync(path.join(deploy, indexName), 'utf8');
if (!index.includes(oldAdmin)) throw new Error('admin import marker missing');
index = index.replaceAll(oldAdmin, newAdmin);
fs.writeFileSync(path.join(stage, indexName), index);

console.log('cache-busted teacher courseware bundle created');
