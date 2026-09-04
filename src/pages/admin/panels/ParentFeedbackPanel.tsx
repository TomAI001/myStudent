import { MessageSquareText, RefreshCw, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState, PageLoader } from '../../../components/States'
import { getParentFeedback, replyToParentFeedback, type ParentFeedbackMessage } from '../../../lib/featureApi'

type Thread = { accountId:string; studentName:string; messages:ParentFeedbackMessage[] }

export default function ParentFeedbackPanel({ classId }: { classId:string }) {
  const [messages,setMessages]=useState<ParentFeedbackMessage[]>([])
  const [loading,setLoading]=useState(false)
  const [reply,setReply]=useState<Record<string,string>>({})
  const [sending,setSending]=useState('')

  const load=useCallback(async()=>{
    if(!classId){setMessages([]);return}
    setLoading(true)
    try{setMessages((await getParentFeedback(classId)).messages)}
    catch(reason){window.alert(reason instanceof Error?reason.message:'读取家长意见失败')}
    finally{setLoading(false)}
  },[classId])
  useEffect(()=>{load()},[load])

  const threads=useMemo<Thread[]>(()=>{
    const grouped=new Map<string,Thread>()
    messages.forEach(message=>{
      const thread=grouped.get(message.accountId)||{accountId:message.accountId,studentName:message.studentName,messages:[]}
      thread.messages.push(message);grouped.set(message.accountId,thread)
    })
    return [...grouped.values()].map(thread=>({...thread,messages:[...thread.messages].sort((a,b)=>a.createdAt.localeCompare(b.createdAt))})).sort((a,b)=>b.messages.at(-1)!.createdAt.localeCompare(a.messages.at(-1)!.createdAt))
  },[messages])

  const submit=async(thread:Thread)=>{
    const content=(reply[thread.accountId]||'').trim()
    if(!content)return
    setSending(thread.accountId)
    try{
      const target=thread.messages.at(-1)!
      const result=await replyToParentFeedback(target.id,content)
      setMessages(current=>[...current,result.message])
      setReply(current=>({...current,[thread.accountId]:''}))
    }catch(reason){window.alert(reason instanceof Error?reason.message:'回复发送失败')}
    finally{setSending('')}
  }

  if(!classId)return <EmptyState title="请先选择班级" description="家长意见会按班级分别显示。"/>
  return <div className="parent-feedback-admin">
    <div className="admin-page-heading"><div><small>PARENT FEEDBACK</small><h1>家长意见反馈</h1><p>阅读家长的建议并及时回复；家长会在成长记录中看到完整对话。</p></div><button type="button" className="admin-secondary" onClick={load} disabled={loading}><RefreshCw/>刷新</button></div>
    {loading?<PageLoader label="正在读取家长意见…"/>:threads.length?<div className="feedback-thread-list">{threads.map(thread=><article key={thread.accountId} className="feedback-thread"><header><span>{thread.studentName.slice(-1)}</span><div><strong>{thread.studentName}家长</strong><small>{thread.messages.length} 条交流记录</small></div></header><div className="feedback-messages">{thread.messages.map(message=><div className={`feedback-message ${message.author}`} key={message.id}><small>{message.author==='parent'?'家长留言':'老师回复'} · {new Date(message.createdAt).toLocaleString('zh-CN')}</small><p>{message.content}</p></div>)}</div><div className="feedback-reply"><textarea value={reply[thread.accountId]||''} onChange={event=>setReply(current=>({...current,[thread.accountId]:event.target.value}))} maxLength={2000} placeholder="写下给家长的回复…" rows={3}/><button type="button" className="admin-primary" disabled={sending===thread.accountId||!(reply[thread.accountId]||'').trim()} onClick={()=>submit(thread)}><Send/>{sending===thread.accountId?'发送中…':'回复'}</button></div></article>)}</div>:<EmptyState title="暂时没有家长意见" description="家长提交意见后，会按学生显示在这里。"/>}
  </div>
}
