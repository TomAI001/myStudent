import fs from 'node:fs';
import path from 'node:path';

const root = 'D:/工作/myStudent_publish';
const deploy = path.join(root, 'deploy');
const stage = path.join(root, 'parent-mobile-images-fix');
const assets = path.join(stage, 'assets');

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(assets, { recursive: true });

const adminOld = fs.readFileSync(path.join(deploy, 'assets/AdminDashboard-B5JuzPiq.js'), 'utf8');
const adminNeedle = '`<figure><img src="${v.url}" alt="${d.name}" /><figcaption>${d.name}</figcaption></figure>`';
const adminReplacement = '`<figure><img src="${v.url}" alt="课堂图片" /></figure>`';
if (!adminOld.includes(adminNeedle)) throw new Error('admin image insertion marker missing');
const adminNewName = 'AdminDashboard-MobileImages-b733b18.js';
fs.writeFileSync(path.join(assets, adminNewName), adminOld.replace(adminNeedle, adminReplacement));

const studentOldName = 'StudentPage-qr-AnQj6.js';
const studentNewName = 'StudentPage-MobileImages-b733b18.js';
let student = fs.readFileSync(path.join(deploy, `assets/${studentOldName}`), 'utf8');
const lazyNeedle = ',loading:"lazy"';
if (!student.includes(lazyNeedle)) throw new Error('student lazy-load marker missing');
student = student.replaceAll(lazyNeedle, '');
fs.writeFileSync(path.join(assets, studentNewName), student);

const cssOldName = 'index-D1Xht0V3.css';
const cssNewName = 'index-MobileImages-b733b18.css';
const css = fs.readFileSync(path.join(deploy, `assets/${cssOldName}`), 'utf8') + `

/* Parent mobile course-review image fix */
.rich-content figure{width:100%;margin:16px 0;overflow:hidden}
.rich-content figure img,.rich-content>img{width:100%;height:auto;max-height:none;display:block;margin:0 auto;object-fit:contain;border-radius:13px}
.rich-content figcaption{display:none!important}
.media-thumb img,.media-thumb video{width:100%;height:100%;object-fit:cover}
.lightbox-content img,.lightbox-content video{display:block;width:auto;max-width:94vw;height:auto;max-height:84vh;margin:auto;object-fit:contain}
@media(max-width:600px){
  .course-content{overflow:hidden}
  .rich-content figure{margin:12px 0;border-radius:10px}
  .rich-content figure img,.rich-content>img{width:100%;max-width:100%;height:auto;max-height:none;border-radius:10px}
  .media-gallery{grid-template-columns:1fr;gap:12px}
  .media-thumb{width:100%;aspect-ratio:4/3;border-radius:12px}
  .lightbox{padding:14px}
  .lightbox-content{width:100%;max-width:100%;max-height:90vh}
  .lightbox-content img,.lightbox-content video{max-width:100%;max-height:82vh}
}
`;
fs.writeFileSync(path.join(assets, cssNewName), css);

const cachedIndex = path.join(root, 'teacher-courseware-cachebust/assets/index-C1ZxpkkS.js');
let main = fs.readFileSync(cachedIndex, 'utf8');
if (!main.includes(studentOldName)) throw new Error('student import marker missing');
main = main.replaceAll(studentOldName, studentNewName);
main = main.replaceAll('AdminDashboard-L3-7230fd9.js', adminNewName);
const mainNewName = 'index-MobileImages-b733b18.js';
fs.writeFileSync(path.join(assets, mainNewName), main);

let html = fs.readFileSync(path.join(deploy, 'index.html'), 'utf8');
html = html.replace('/assets/index-C1ZxpkkS.js', `/assets/${mainNewName}`);
html = html.replace(`/assets/${cssOldName}`, `/assets/${cssNewName}`);
fs.writeFileSync(path.join(stage, 'index.html'), html);

console.log('parent mobile image fix built');
