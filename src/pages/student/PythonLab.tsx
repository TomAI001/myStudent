import { Code2, LoaderCircle, Play, RotateCcw, Save, TerminalSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { runPythonCode, usesTurtle } from '../../lib/pythonRuntime'

const starterCode = `# 我的 Python 小程序\nname = "林小满"\nfor level in range(1, 4):\n    print(f"{name} 解锁了第 {level} 关！")\nprint("编程冒险继续出发！")`

export default function PythonLab() {
  const [code, setCode] = useState(() => window.localStorage.getItem('growth-python-draft') || starterCode)
  const [output, setOutput] = useState('点击“运行程序”，这里会显示结果。')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const turtleMode = usesTurtle(code)

  useEffect(() => { if (!saved) return; const id = window.setTimeout(() => setSaved(false), 1600); return () => window.clearTimeout(id) }, [saved])

  const run = async () => {
    setRunning(true); setOutput('正在启动 Python…第一次运行需要下载运行组件。')
    try {
      setOutput(await runPythonCode(code, setOutput))
    } catch (reason) { setOutput(`运行出错：\n${reason instanceof Error ? reason.message : String(reason)}`) }
    finally { setRunning(false) }
  }

  const save = () => { window.localStorage.setItem('growth-python-draft', code); setSaved(true) }

  return (
    <section className="python-lab">
      <div className="lab-heading"><div><span><Code2 /></span><div><small>PYTHON PLAYGROUND</small><h2>代码实验室</h2></div></div><p>支持基础 Python 与 Turtle 海龟绘图；tkinter、Pygame 将由服务器图形环境运行。</p></div>
      <div className="lab-window">
        <div className="lab-toolbar"><span className="window-dots"><i /><i /><i /></span><strong>main.py</strong><div><button type="button" onClick={() => setCode(starterCode)}><RotateCcw /> 重置</button><button type="button" onClick={save}><Save /> {saved ? '已保存' : '保存代码'}</button><button type="button" className="run-code" onClick={run} disabled={running}>{running ? <LoaderCircle className="spin" /> : <Play />} {running ? '运行中' : '运行程序'}</button></div></div>
        <div className="lab-grid"><div className="code-editor-wrap"><div className="line-numbers">{code.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label="Python 代码编辑器" /></div><div className={`console-panel ${turtleMode ? 'has-turtle-canvas' : ''}`}><div><TerminalSquare /> {turtleMode ? '海龟绘图结果' : '运行结果'}</div>{turtleMode && <div className="turtle-canvas-wrap"><canvas id="student-turtle-canvas" width="720" height="420" aria-label="Turtle 海龟绘图画布" /></div>}<pre>{output}</pre></div></div>
      </div>
    </section>
  )
}
