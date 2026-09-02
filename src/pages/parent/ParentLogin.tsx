import { ArrowRight, BookHeart, KeyRound, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getParentServerSession, loginParentOnServer } from '../../lib/serverApi'

export default function ParentLogin(){
  const navigate=useNavigate();const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [checkingSession,setCheckingSession]=useState(true)
  useEffect(()=>{let active=true;getParentServerSession().then(session=>{if(!active)return;if(session?.studentId)navigate('/parent/app',{replace:true});else setCheckingSession(false)}).catch(()=>active&&setCheckingSession(false));return()=>{active=false}},[navigate])
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setLoading(true);setError('');try{await loginParentOnServer(username,password);navigate('/parent/app',{replace:true})}catch(reason){setError(reason instanceof Error?reason.message:'暂时无法登录，请稍后再试。')}finally{setLoading(false)}}
  if(checkingSession)return <div className="page-center"><div className="parent-session-loader" aria-label="正在检查家长登录状态"><span className="spin"/>正在进入家长端…</div></div>
  return <div className="parent-login-page"><main className="parent-login-card"><section className="parent-login-welcome"><span className="eyebrow"><Sparkles/>成长陪伴空间</span><h1>陪孩子一起<br/><em>看见每一次进步</em></h1><p>登录后只会显示您孩子的课程、每日作业、测评成绩和老师课评。</p><div><span><BookHeart/><b>课堂成长记录</b></span><span><ShieldCheck/><b>一对一隐私查看</b></span></div></section><section className="parent-login-form"><div className="parent-login-mark"><UsersRound/></div><small>PARENT LOGIN</small><h2>家长登录</h2><p>账号为字母 a 加学生账号，密码与学生密码一致。</p><form onSubmit={submit}><label>家长账号<div><UsersRound/><input value={username} onChange={event=>setUsername(event.target.value)} placeholder="例如：astudent01" autoComplete="username" required/></div></label><label>登录密码<div><KeyRound/><input type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="请输入登录密码" autoComplete="current-password" required/></div></label>{error&&<em>{error}</em>}<button disabled={loading}>{loading?'正在验证…':'查看孩子的成长'}<ArrowRight/></button></form><Link to="/student/login">我是学生，前往学生端</Link></section></main></div>
}
