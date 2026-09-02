import { ArrowLeft, CheckCircle2, Keyboard, RotateCcw, Sparkles, Timer, Trophy, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { studentAction, type StudentFeatureState, type TypingProgress } from '../../lib/featureApi'

const levels=[
  {title:'基准键热身',focus:'左手 asdf · 右手 jkl;',target:'asdf jkl; asdf jkl; fjdk sla; asdf jkl;'},
  {title:'字母探险',focus:'常用英文字母组合',target:'qwer uiop zxcv nm, asdfghjkl qwertyuiop zxcvbnm'},
  {title:'数字与符号',focus:'数字行、括号和运算符',target:'12345 67890 + - * / = ( ) : , . 12345 67890'},
  {title:'Python关键词',focus:'常用代码单词',target:'print input range for while if else def return import'},
  {title:'变量与计算',focus:'短代码组合',target:'score = 100 total = score + 20 print(total)'},
  {title:'循环起步',focus:'for与range',target:'for i in range(5): print(i)'},
  {title:'星号图形',focus:'字符串乘法',target:'for i in range(1, 6): print("* " * i)'},
  {title:'双重循环',focus:'两层循环结构',target:'for row in range(5): for col in range(5): print("*", end="")'},
  {title:'小程序片段',focus:'输入、转换与输出',target:'name = input("你的名字：") age = int(input("年龄：")) print(name, age)'},
  {title:'综合毕业关',focus:'代码与中文说明',target:'循环可以把重复任务交给电脑。for i in range(1, 10): print(i, "继续挑战Python！")'},
]

export default function TypingPractice({features,onRefresh,onBack}:{features:StudentFeatureState|null;onRefresh:()=>Promise<void>;onBack:()=>void}){
  const [level,setLevel]=useState(1);const [text,setText]=useState('');const [startedAt,setStartedAt]=useState<number|null>(null);const [seconds,setSeconds]=useState(0);const [saved,setSaved]=useState<TypingProgress|null>(null);const [saving,setSaving]=useState(false)
  const item=levels[level-1];const target=item.target
  const correct=useMemo(()=>text.split('').filter((char,index)=>char===target[index]).length,[text,target])
  const accuracy=text.length?Math.round(correct/text.length*100):100;const finished=text.length===target.length;const elapsed=startedAt?Math.max(1,finished?Math.ceil((Date.now()-startedAt)/1000):seconds):0;const speed=elapsed?Math.round(correct/elapsed*60):0
  const records=useMemo(()=>new Map((features?.typingProgress||[]).map(row=>[row.level,row])),[features])
  useEffect(()=>{if(!startedAt||finished)return;const timer=window.setInterval(()=>setSeconds(Math.max(1,Math.floor((Date.now()-startedAt)/1000))),500);return()=>window.clearInterval(timer)},[startedAt,finished])
  useEffect(()=>{if(!finished||saved||saving)return;setSaving(true);studentAction('/student/typing-progress','POST',{level,speed,accuracy}).then((row:TypingProgress)=>{setSaved(row);return onRefresh()}).catch(reason=>window.alert(reason instanceof Error?reason.message:'成绩保存失败')).finally(()=>setSaving(false))},[accuracy,finished,level,onRefresh,saved,saving,speed])
  const reset=(next=level)=>{setLevel(next);setText('');setStartedAt(null);setSeconds(0);setSaved(null)}
  const change=(value:string)=>{if(!startedAt&&value)setStartedAt(Date.now());if(value.length<=target.length)setText(value)}
  return <main className="student-module-page typing-page"><header><button onClick={onBack}><ArrowLeft/>返回冒险大厅</button><div><small>KEYBOARD TRAINING · 10 LEVELS</small><h1>打字训练营</h1><p>10个关卡可以自由选择；正确率达到90%即可通关，最佳速度和正确率会保存到你的账号。</p></div></header>
    <section className="typing-level-grid">{levels.map((entry,index)=>{const number=index+1;const record=records.get(number);return <button key={number} className={`${level===number?'active':''} ${record?.completed?'completed':''}`} onClick={()=>reset(number)}><span>{record?.completed?<CheckCircle2/>:number}</span><div><strong>第{number}关 · {entry.title}</strong><small>{record?`最佳 ${record.best_speed} 字/分 · ${record.best_accuracy}%`:'尚未练习'}</small></div></button>})}</section>
    <section className="typing-current-level"><div><Keyboard/><span><small>LEVEL {String(level).padStart(2,'0')}</small><strong>{item.title}</strong></span></div><p>{item.focus}</p></section>
    <section className="typing-dashboard"><div><Timer/><span><small>用时</small><strong>{elapsed}s</strong></span></div><div><Zap/><span><small>速度</small><strong>{speed} 字/分</strong></span></div><div><Sparkles/><span><small>正确率</small><strong>{accuracy}%</strong></span></div><div><Trophy/><span><small>完成度</small><strong>{Math.round(text.length/target.length*100)}%</strong></span></div></section>
    <section className="typing-workbench"><div className="typing-target" aria-label="需要输入的内容">{target.split('').map((char,index)=><span key={index} className={index<text.length?(text[index]===char?'typed-correct':'typed-wrong'):index===text.length?'typing-current':''}>{char===' '?' ':char}</span>)}</div><textarea autoFocus spellCheck={false} value={text} disabled={finished} onChange={e=>change(e.target.value)} placeholder="点击这里，照着上面的内容开始输入……"/><footer><span>{text.length} / {target.length} 个字符</span><button onClick={()=>reset()}><RotateCcw/>重新开始</button></footer></section>
    {finished&&<section className={`typing-result ${accuracy>=90?'passed':'retry'}`}><Trophy/><div><small>{saving?'正在保存成绩…':accuracy>=90?'本关通关':'还差一点点'}</small><strong>{accuracy>=90?'太棒了，最佳记录已更新！':'正确率达到90%即可通关，再练一次吧。'}</strong><p>本次速度 {speed} 字/分，正确率 {accuracy}%{saved?` · 已练习 ${saved.attempts} 次`:''}</p></div><button onClick={()=>reset()}><RotateCcw/>再练一次</button></section>}
  </main>
}
