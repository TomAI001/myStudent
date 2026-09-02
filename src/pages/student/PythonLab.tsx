import { Code2, LoaderCircle, Play, RotateCcw, Save, TerminalSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { runPythonCode } from '../../lib/pythonRuntime'
import { studentAction } from '../../lib/featureApi'

const starterCode = `# 我的 Python 小程序\nname = "林小满"\nfor level in range(1, 4):\n    print(f"{name} 解锁了第 {level} 关！")\nprint("编程冒险继续出发！")`

export default function PythonLab() {
  const [code, setCode] = useState(() => window.localStorage.getItem('growth-python-draft') || starterCode)
  const [output, setOutput] = useState('点击“运行程序”，这里会显示结果。')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [projectId]=useState(()=>window.localStorage.getItem('growth-python-project-id')||crypto.randomUUID?.()||`project-${Date.now()}`)

  useEffect(() => { if (!saved) return; const id = window.setTimeout(() => setSaved(false), 1600); return () => window.clearTimeout(id) }, [saved])

  useEffect(()=>{window.localStorage.setItem('growth-python-project-id',projectId);const timer=window.setTimeout(()=>{studentAction(`/student/code-projects/${projectId}`,'PUT',{title:'我的课堂Python作品',code}).then(()=>setSaved(true)).catch(()=>undefined)},800);return()=>window.clearTimeout(timer)},[code,projectId])

  const run = async () => {
    setRunning(true); setOutput('正在启动本地 Python…首次加载后会缓存在浏览器中。')
    try {
      setOutput(await runPythonCode(code, setOutput))
    } catch (reason) { setOutput(`运行出错：\n${reason instanceof Error ? reason.message : String(reason)}`) }
    finally { setRunning(false) }
  }

  const save = async() => { window.localStorage.setItem('growth-python-draft', code);await studentAction(`/student/code-projects/${projectId}`,'PUT',{title:'我的课堂Python作品',code});setSaved(true) }

  return (
    <section className="python-lab">
      <div className="lab-heading"><div><span><Code2 /></span><div><small>PYTHON PLAYGROUND</small><h2>代码实验室</h2></div></div><p>只运行普通 Python，组件由本站提供并缓存；不再下载 Turtle、Pygame 等图形库。</p></div>
      <div className="lab-window">
        <div className="lab-toolbar"><span className="window-dots"><i /><i /><i /></span><strong>main.py</strong><div><button type="button" onClick={() => setCode(starterCode)}><RotateCcw /> 重置</button><button type="button" onClick={save}><Save /> {saved ? '已保存' : '保存代码'}</button><button type="button" className="run-code" onClick={run} disabled={running}>{running ? <LoaderCircle className="spin" /> : <Play />} {running ? '运行中' : '运行程序'}</button></div></div>
        <div className="lab-grid"><div className="code-editor-wrap"><div className="line-numbers">{code.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label="Python 代码编辑器" /></div><div className="console-panel"><div><TerminalSquare /> 运行结果</div><pre>{output}</pre></div></div>
      </div>
    </section>
  )
}
