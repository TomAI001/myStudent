type PyodideRuntime = {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (options: { batched: (text: string) => void }) => void
  setStderr: (options: { batched: (text: string) => void }) => void
}

declare global { interface Window { loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime> } }

let runtimePromise: Promise<PyodideRuntime> | null = null
const pyodideBase = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/'

function loadRuntime() {
  if (runtimePromise) return runtimePromise
  runtimePromise = new Promise((resolve, reject) => {
    const ready = () => window.loadPyodide?.({ indexURL: pyodideBase }).then(resolve).catch(reject)
    if (window.loadPyodide) return ready()
    const script = document.createElement('script')
    script.src = `${pyodideBase}pyodide.js`
    script.async = true
    script.onload = ready
    script.onerror = () => reject(new Error('Python 运行组件加载失败'))
    document.head.appendChild(script)
  })
  return runtimePromise
}

export async function runPythonCode(code: string, onOutput?: (output: string) => void) {
  const runtime = await loadRuntime(); const lines: string[] = []
  const push = (text: string) => { lines.push(text); onOutput?.(lines.join('\n')) }
  runtime.setStdout({ batched: push }); runtime.setStderr({ batched: push })
  await runtime.runPythonAsync(code)
  return lines.join('\n') || '程序运行完成（没有输出内容）。'
}
