import fs from 'node:fs';

const file = 'D:/工作/myStudent_publish/deploy/assets/AdminDashboard-B5JuzPiq.js';
let source = fs.readFileSync(file, 'utf8');

const before = 'm=c.coursewarePackages.filter(a=>a.classId===r||a.classId==="python-summer"),p=a=>';
const after = 'm=[{id:"builtin-python-lesson-3",classId:"python-summer",title:"第三课 Python 课件",fileName:"内置网页课件",openAt:"2026-08-27T08:00",published:!0,url:"/courseware/no.3/index.html"},...c.coursewarePackages.filter(a=>a.classId===r||a.classId==="python-summer")],p=a=>';

if (!source.includes(before)) throw new Error('courseware list marker missing');
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log('teacher lesson 3 entry added');
