import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLoader } from '../../components/States'
import { getParentServerSession, logoutParentOnServer, type ParentServerSession } from '../../lib/serverApi'
import StudentPage from '../StudentPage'

export default function ParentPortal(){
  const navigate=useNavigate();const [session,setSession]=useState<ParentServerSession|null|undefined>(undefined)
  useEffect(()=>{let active=true;getParentServerSession().then(next=>{if(!active)return;if(!next?.studentId)navigate('/parent/login',{replace:true});else setSession(next)}).catch(()=>active&&navigate('/parent/login',{replace:true}));return()=>{active=false}},[navigate])
  if(session===undefined)return <div className="page-center"><PageLoader label="正在打开孩子的成长记录…"/></div>
  if(!session?.studentId)return null
  const logout=async()=>{await logoutParentOnServer();navigate('/parent/login',{replace:true})}
  return <StudentPage studentIdOverride={session.studentId} parentName={session.parentName} onParentLogout={logout}/>
}
