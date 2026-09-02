const params=new URLSearchParams(location.search);
const student={id:params.get('studentId')||'demo-student-01',name:params.get('studentName')||'林小满'};
const storageKey=`python_lesson3_${student.id}`;
const state=JSON.parse(localStorage.getItem(storageKey)||`{"score":${Number(params.get('points'))||0},"attempts":{}}`);
state.score=Math.max(Number(state.score)||0,Number(params.get('points'))||0);
const persist=()=>localStorage.setItem(storageKey,JSON.stringify(state));
const pages=[
 ['concept','WARM UP','不用电脑，先心算','12 + 8 × 2 = ?','先乘除，后加减。稍后让 Python 验证答案。'],
 ['concept','教材第 3 章','Python 认识不同的数字','整数 int｜8、100、-12;小数 float｜3.14、0.5、-2.7;运算结果｜输入表达式，Python 立即回答'],
 ['concept','CALCULATOR MODE','六个常用运算符','+ 加法｜12 + 8;- 减法｜20 - 7;* 乘法｜6 * 9;/ 除法｜20 / 4;// 整除｜17 // 5;% 余数｜17 % 5'],
 ['concept','运算优先级','Python 也遵守数学规则','(12 + 8) * 2 = 40','括号 → 乘除 → 加减；想让哪一步先算，就给它戴上括号皇冠。'],
 ['quiz','积分题 01 · 100 XP','Python 会先算哪一步？','10 + 6;6 * 3;从左到右随便算','1','乘法优先，所以先算 6 × 3。'],
 ['code','代码实验室 01','让 Python 帮我们验算','print(12 + 8 * 2)\nprint((12 + 8) * 2)\nprint(17 // 5)\nprint(17 % 5)','我的运算实验'],
 ['challenge','动手挑战','设计一道“看起来一样，答案不同”的题','先写一个没有括号的表达式;再加括号改变运算顺序;运行并向同桌解释答案为什么不同'],
 ['concept','VARIABLE UNLOCKED','变量是有名字的盒子','score = 100','= 表示“把右边的值交给左边的名字”。'],
 ['concept','赋值的秘密','先算右边，再放进左边','coins = 5｜盒子里先有 5 枚金币;coins = coins + 3｜取出 5，加 3，再放回去;print(coins)｜最后看到 8'],
 ['concept','变量命名规则','好名字让代码自己会说话','✅ user_name｜字母、数字、下划线;✅ total2｜数字不能放在最前面;❌ 2total｜不能数字开头;❌ user name｜名字中不能有空格'],
 ['quiz','积分题 02 · 100 XP','哪个变量名是正确的？','2score;my score;my_score','2','变量名可以包含下划线，但不能有空格，也不能以数字开头。'],
 ['code','代码实验室 02','金币盒子会变化','coins = 5\nprint("出发时：", coins)\ncoins = coins + 3\nprint("完成任务后：", coins)','金币变量实验'],
 ['concept','STRING UNLOCKED','文字也是一种数据','hero = "星光骑士"','放在引号里的内容叫字符串，类型名是 str。'],
 ['concept','文字拼接','用 + 把字符串接起来','hero = "小满"｜先保存名字;message = "你好，" + hero｜拼成一句话;print(message)｜输出：你好，小满'],
 ['quiz','积分题 03 · 100 XP','下面哪一个是字符串？','100;"100";100 + 20','1','只要被引号包住，它就是字符串，即使看起来像数字。'],
 ['concept','INPUT UNLOCKED','input() 让程序听见你','name = input("你叫什么名字？")','程序暂停并等待用户输入，然后把答案保存起来。'],
 ['code','代码实验室 03','做一个会打招呼的程序','name = input("你叫什么名字？")\nprint("你好，" + name + "！")\nprint("欢迎进入 Python 魔法学院！")','会问名字的程序'],
 ['concept','重要发现','input() 收到的都是字符串','age = int(input("你几岁？"))','你输入 8，程序拿到的是 "8"；想计算，需要先转换。'],
 ['quiz','积分题 04 · 100 XP','input() 默认得到什么类型？','int 整数;str 字符串;float 小数','1','input() 的结果默认是字符串，需要 int() 或 float() 才能计算。'],
 ['concept','TYPE CHANGE','int() 是数字变身器','"12"｜看起来像数字的文字;int("12")｜转换为整数;int("12") + 3｜现在可以得到 15'],
 ['challenge','找错挑战','为什么会出现 TypeError？','找到字符串和整数混用的位置;给 input() 外面套上 int();再次运行，确认年龄加 1','age = input("你几岁？")\nprint(age + 1)'],
 ['break','ENERGY RESTORE','课间休息 10 分钟','喝水、远眺、活动手指。回来后组装真正的魔法计算器！'],
 ['concept','PROJECT MAP','计算器需要哪些零件？','输入｜拿到第一个数、第二个数;转换｜用 float() 变成可计算的数字;计算｜完成 +、-、*、/;输出｜把清楚的答案告诉用户'],
 ['concept','程序流程','输入 → 处理 → 输出','用户输入  ➜  Python 计算  ➜  屏幕显示','几乎所有程序都能找到这三个阶段。'],
 ['code','代码实验室 04','第一台加法计算器','a = float(input("第一个数："))\nb = float(input("第二个数："))\nanswer = a + b\nprint("计算结果：", answer)','两数加法器'],
 ['concept','一个程序，多种能力','把运算符也装进变量','add = a + b\nminus = a - b\ntimes = a * b\ndivide = a / b','同一组输入，可以得到四种不同答案。'],
 ['quiz','积分题 05 · 100 XP','哪一行能把输入转换成小数？','number = input();number = float(input());number = print(input())','1','float() 可以把输入的文字转换为小数。'],
 ['challenge','限时挑战 · 6 分钟','做一个长方形面积计算器','输入长 length;输入宽 width;计算 area = length * width;输出清楚的完整句子'],
 ['concept','整数与小数','什么时候用 int，什么时候用 float？','人数、次数、年龄｜通常使用 int;身高、价格、长度｜通常使用 float;不确定会不会有小数｜优先使用 float'],
 ['quiz','积分题 06 · 100 XP','计算商品价格，最适合使用？','int;float;str','1','价格可能出现小数，因此更适合使用 float。'],
 ['concept','漂亮输出','f-string 把变量放进句子','print(f"{a} + {b} = {answer}")','在字符串前加 f，再把变量写进 { }。'],
 ['code','代码实验室 05','制作迷你购物小票','name = input("商品名称：")\nprice = float(input("商品单价："))\ncount = int(input("购买数量："))\ntotal = price * count\nprint(f"{name} × {count} = {total} 元")','迷你购物小票'],
 ['challenge','BUG CLINIC','四位“病人”等你诊断','修复变量名中的空格;把 age 转成整数;检查每对引号和括号;运行并验证答案','user name = "小满"\nage = input("年龄：")\nnext_age = age + 1'],
 ['quiz','积分题 07 · 100 XP','f-string 中变量应该写在哪里？','( );[ ];{ }','2','f-string 使用花括号 { } 把变量嵌入文字。'],
 ['challenge','MINI PROJECT','未来年龄预测器','询问姓名和年龄;询问想预测几年后;计算未来年龄;用 f-string 输出完整结果'],
 ['final','FINAL BOSS','终极作品：Python 魔法计算器','让用户输入两个数，一次看到加、减、乘、除四个答案。'],
 ['concept','STEP 01','收集两个数字','a = float(input("请输入第一个数："))\nb = float(input("请输入第二个数："))'],
 ['concept','STEP 02','保存四种答案','add = a + b\nminus = a - b\ntimes = a * b\ndivide = a / b'],
 ['concept','STEP 03','让答案一眼就能看懂','print(f"{a} + {b} = {add}")\nprint(f"{a} - {b} = {minus}")\nprint(f"{a} × {b} = {times}")\nprint(f"{a} ÷ {b} = {divide}")'],
 ['code','终极代码实验室','完成并保存你的魔法计算器','print("=== Python 魔法计算器 ===")\na = float(input("请输入第一个数："))\nb = float(input("请输入第二个数："))\nprint(f"{a} + {b} = {a + b}")\nprint(f"{a} - {b} = {a - b}")\nprint(f"{a} × {b} = {a * b}")\nprint(f"{a} ÷ {b} = {a / b}")','我的魔法计算器'],
 ['quiz','积分题 08 · 100 XP','哪条路线能做出正确计算器？','input → float → 计算 → print;print → input → 删除变量;只写数字，不接收输入','0','正确流程是先输入，再转换，接着计算，最后输出。'],
 ['concept','代码如何使用','解锁后复制到课堂编辑器','先预测｜不要急着看答案;点解锁｜对照自己的思路;复制代码｜到 Python 编辑器运行;主动修改｜改变数字、文字和功能'],
 ['concept','KNOWLEDGE CHECK','今天的五把钥匙','运算符｜+ - * / // %;变量｜给数据一个名字;字符串｜引号里的文字;input()｜接收用户输入;类型转换｜int() / float()'],
 ['final','MISSION COMPLETE','计算魔法师，升级成功！','你已经能让程序记住数据、听懂输入、完成计算并清楚地回答。','课后挑战：设计一个“零花钱计划器”或“旅行时间计算器”。']
];
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cards=v=>`<div class="content-cards">${v.split(';').map(x=>{const [a,b]=x.split('｜');return `<article><h3>${esc(a)}</h3>${b?`<p>${esc(b)}</p>`:''}</article>`}).join('')}</div>`;
const speedChallenges={
 '让 Python 帮我们验算':'自己设计3组带括号的混合运算，再加入 **、// 或 % 中的两种运算，并预测每一行答案。',
 '金币盒子会变化':'增加“获得金币、购买道具、剩余金币”三个变量，最后用一行算式输出玩家还剩多少金币。',
 '做一个会打招呼的程序':'除了姓名，再询问城市和爱好，用 f-string 生成一句专属于自己的冒险欢迎语。',
 '第一台加法计算器':'在加法之外增加减法、乘法和除法，并让每一种结果都显示成完整算式。',
 '制作迷你购物小票':'再询问付款金额，计算并输出应找回多少钱；给小票增加一条自己设计的结束语。',
 '完成并保存你的魔法计算器':'增加整除、余数和乘方三项功能，并为计算器设计独一无二的名称与开场提示。'
};
function pageHtml(p,n){const [type,eye,title,a='',b='',c='']=p,head=`<p class="eyebrow">${esc(eye)}</p><h2>${esc(title)}</h2>`;
 if(type==='quiz')return `<section class="slide surface-quiz"><div class="slide-content">${head}<div class="quiz-box" data-correct="${b}"><div class="quiz-options">${a.split(';').map((x,i)=>`<button data-answer="${i}">${String.fromCharCode(65+i)}. ${esc(x)}</button>`).join('')}</div><p class="quiz-feedback"></p><small data-explain="${esc(c)}">每题只能作答一次 · 答对 +100 XP</small></div></div></section>`;
 if(type==='code')return `<section class="slide surface-code"><div class="slide-content">${head}<p class="page-lead">先预测程序会做什么，再点击按钮解锁完整代码。</p><div class="project-layout"><div class="locked-code"><div class="code-lock"><span>🔒</span><h3>代码暂未解锁</h3><p>先说出你的思路，再查看参考代码。</p><button class="unlock-code">解锁代码</button></div><pre class="display-code code-reveal" hidden>${esc(a)}</pre><div class="unlocked-actions" hidden><button class="copy-code">复制代码</button><span>请到课堂使用的 Python 编辑器中运行和修改</span></div></div><aside class="speed-challenge"><small>FAST TRACK</small><h3>⚡ 高手加练</h3><p>${esc(speedChallenges[title]||'完成基础作品后，至少修改三个参数，并向同学解释每次修改带来的变化。')}</p><strong>基础任务完成后解锁</strong></aside></div></div></section>`;
 if(type==='challenge')return `<section class="slide surface-pink"><div class="slide-content">${head}${b?`<pre class="display-code">${esc(b)}</pre>`:''}<ol class="challenge-steps">${a.split(';').map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="badge">🏆 挑战任务</div></div></section>`;
 if(type==='break')return `<section class="slide surface-dark"><div class="center-slide">${head}<p class="page-lead">${esc(a)}</p><div class="timer" id="breakTimer">10:00</div><button class="timer-start">开始倒计时</button></div></section>`;
 if(type==='final')return `<section class="slide surface-final"><div class="center-slide">${head}<p class="page-lead">${esc(a)}</p>${b?`<div class="big-note">${esc(b)}</div>`:''}<div class="pixel-wand">✦</div></div></section>`;
 const isCode=a.includes('\n')||a.includes('print(')||a.includes('input('),isCards=a.includes('｜');return `<section class="slide ${n%3===0?'surface-lav':''}"><div class="slide-content">${head}${isCards?cards(a):isCode?`<pre class="display-code">${esc(a)}</pre>`:`<div class="formula">${esc(a)}</div>`}${b?`<div class="big-note">${esc(b)}</div>`:''}</div></section>`}
pages.forEach((p,i)=>document.querySelector('#deck').insertAdjacentHTML('beforeend',pageHtml(p,i+3)));
let slides=[...document.querySelectorAll('.slide')],current=0;const scoreEl=document.querySelector('#scoreValue');document.querySelector('#studentName').textContent=student.name;
function updateScore(){scoreEl.textContent=state.score||0}function show(i){current=Math.max(0,Math.min(i,slides.length-1));slides.forEach((s,n)=>s.classList.toggle('active',n===current));document.querySelector('#slideCounter').textContent=`${String(current+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;document.querySelector('#progressBar').style.width=`${(current+1)/slides.length*100}%`;location.hash=current+1;parent.postMessage({type:'growth-courseware:progress',lessonId:'lesson-3',currentSlide:current+1,totalSlides:slides.length,completed:current===slides.length-1},location.origin)}
document.querySelector('#prevButton').onclick=()=>show(current-1);document.querySelector('#nextButton').onclick=()=>show(current+1);addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(['ArrowRight',' '].includes(e.key))show(current+1);if(e.key==='ArrowLeft')show(current-1)});
document.querySelectorAll('.quiz-box').forEach((box,idx)=>{const qid=`lesson3-q${idx+1}`;const buttons=[...box.querySelectorAll('button')],feedback=box.querySelector('.quiz-feedback'),explain=box.querySelector('small').dataset.explain;function paint(){const old=state.attempts[qid];if(!old)return;buttons.forEach((x,i)=>{x.disabled=true;x.classList.toggle('chosen',i===old.answer);x.classList.toggle('correct',i===Number(box.dataset.correct))});feedback.textContent=old.correct?'回答正确，已获得 100 XP！':'本题已经作答，不能再次修改。'}paint();buttons.forEach((x,i)=>x.onclick=()=>{if(state.attempts[qid])return;const ok=i===Number(box.dataset.correct);state.attempts[qid]={answer:i,correct:ok};if(ok)state.score+=100;persist();updateScore();paint();parent.postMessage({type:'growth-courseware:score',questionId:qid,correct:ok,points:100},location.origin);feedback.textContent=(ok?'回答正确！+100 XP。':'这次没有得分。')+explain})});
document.querySelectorAll('.locked-code').forEach(box=>{const lock=box.querySelector('.code-lock'),code=box.querySelector('.code-reveal'),actions=box.querySelector('.unlocked-actions');box.querySelector('.unlock-code').onclick=()=>{lock.hidden=true;code.hidden=false;actions.hidden=false};box.querySelector('.copy-code').onclick=async e=>{await navigator.clipboard.writeText(code.textContent);e.currentTarget.textContent='✓ 已复制';setTimeout(()=>e.currentTarget.textContent='复制代码',1400)}});
let timer;document.querySelector('.timer-start')?.addEventListener('click',()=>{clearInterval(timer);let s=600;timer=setInterval(()=>{s--;document.querySelector('#breakTimer').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;if(s<=0)clearInterval(timer)},1000)});updateScore();show(Math.max(0,(Number(location.hash.slice(1))||1)-1));
