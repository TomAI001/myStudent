type PyodideRuntime = {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (options: { batched: (text: string) => void }) => void
  setStderr: (options: { batched: (text: string) => void }) => void
}

declare global { interface Window { loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime> } }

let runtimePromise: Promise<PyodideRuntime> | null = null
const pyodideBase = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/'

const turtleCompatibilityLayer = String.raw`
import math as _math
import sys as _sys
import types as _types
from js import document as _document

_canvas = _document.getElementById("student-turtle-canvas")
if _canvas is None:
    raise RuntimeError("找不到海龟绘图画布")

_canvas.width = 720
_canvas.height = 420
_ctx = _canvas.getContext("2d")
_ctx.clearRect(0, 0, _canvas.width, _canvas.height)
_ctx.fillStyle = "#ffffff"
_ctx.fillRect(0, 0, _canvas.width, _canvas.height)
_ctx.lineCap = "round"
_ctx.lineJoin = "round"

def _point(x, y):
    return (_canvas.width / 2 + x, _canvas.height / 2 - y)

class _Turtle:
    def __init__(self, shape="classic", visible=True):
        self._x = 0.0
        self._y = 0.0
        self._heading = 0.0
        self._down = True
        self._color = "#162236"
        self._fillcolor = "#7be99b"
        self._width = 2
        self._visible = visible

    def _move_to(self, nx, ny):
        if self._down:
            x1, y1 = _point(self._x, self._y)
            x2, y2 = _point(nx, ny)
            _ctx.beginPath()
            _ctx.moveTo(x1, y1)
            _ctx.lineTo(x2, y2)
            _ctx.strokeStyle = self._color
            _ctx.lineWidth = self._width
            _ctx.stroke()
        self._x, self._y = float(nx), float(ny)

    def forward(self, distance):
        angle = _math.radians(self._heading)
        self._move_to(self._x + _math.cos(angle) * distance,
                      self._y + _math.sin(angle) * distance)

    fd = forward

    def backward(self, distance):
        self.forward(-distance)

    back = backward
    bk = backward

    def right(self, angle):
        self._heading = (self._heading - angle) % 360

    rt = right

    def left(self, angle):
        self._heading = (self._heading + angle) % 360

    lt = left

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._move_to(float(x), float(y))

    setpos = goto
    setposition = goto

    def setx(self, x): self._move_to(float(x), self._y)
    def sety(self, y): self._move_to(self._x, float(y))
    def setheading(self, angle): self._heading = float(angle) % 360
    seth = setheading
    def heading(self): return self._heading
    def position(self): return (self._x, self._y)
    pos = position
    def xcor(self): return self._x
    def ycor(self): return self._y

    def penup(self): self._down = False
    pu = penup
    up = penup
    def pendown(self): self._down = True
    pd = pendown
    down = pendown
    def isdown(self): return self._down

    def pensize(self, width=None):
        if width is None: return self._width
        self._width = float(width)
    width = pensize

    def pencolor(self, color=None):
        if color is None: return self._color
        self._color = str(color)

    def fillcolor(self, color=None):
        if color is None: return self._fillcolor
        self._fillcolor = str(color)

    def color(self, *colors):
        if not colors: return (self._color, self._fillcolor)
        self._color = str(colors[0])
        self._fillcolor = str(colors[-1])

    def circle(self, radius, extent=360, steps=None):
        extent = 360 if extent is None else float(extent)
        steps = int(steps or max(12, abs(extent) // 6))
        if steps <= 0: return
        step_angle = extent / steps
        step_length = 2 * _math.pi * abs(radius) * abs(extent) / 360 / steps
        turn = step_angle if radius >= 0 else -step_angle
        for _ in range(steps):
            self.left(turn / 2)
            self.forward(step_length if radius >= 0 else -step_length)
            self.left(turn / 2)

    def dot(self, size=6, color=None):
        x, y = _point(self._x, self._y)
        _ctx.beginPath()
        _ctx.arc(x, y, float(size) / 2, 0, 2 * _math.pi)
        _ctx.fillStyle = str(color or self._color)
        _ctx.fill()

    def write(self, text, move=False, align="left", font=("Arial", 14, "normal")):
        x, y = _point(self._x, self._y)
        size = font[1] if len(font) > 1 else 14
        family = font[0] if font else "Arial"
        _ctx.fillStyle = self._color
        _ctx.font = f"{size}px {family}"
        _ctx.textAlign = align
        _ctx.fillText(str(text), x, y)

    def home(self):
        self.goto(0, 0)
        self.setheading(0)

    def clear(self):
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height)
        _ctx.fillStyle = "#ffffff"
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height)

    def reset(self):
        self.clear()
        self._x = self._y = self._heading = 0.0
        self._down = True

    def speed(self, value=None): return 0
    def hideturtle(self): self._visible = False
    ht = hideturtle
    def showturtle(self): self._visible = True
    st = showturtle
    def begin_fill(self): pass
    def end_fill(self): pass
    def shape(self, value=None): return "classic"

class _Screen:
    def bgcolor(self, color=None):
        if color is None: return "white"
        _ctx.fillStyle = str(color)
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height)
    def title(self, value): return value
    def setup(self, width=None, height=None, startx=None, starty=None): return None
    def tracer(self, *args): return None
    def update(self): return None
    def exitonclick(self): return None
    def mainloop(self): return None
    def bye(self): return None

_default_turtle = _Turtle()
_screen = _Screen()
_module = _types.ModuleType("turtle")
_module.Turtle = _Turtle
_module.RawTurtle = _Turtle
_module.Pen = _Turtle
_module.Screen = lambda: _screen
_module.TurtleScreen = _Screen

for _name in (
    "forward", "fd", "backward", "back", "bk", "right", "rt", "left", "lt",
    "goto", "setpos", "setposition", "setx", "sety", "setheading", "seth",
    "heading", "position", "pos", "xcor", "ycor", "penup", "pu", "up",
    "pendown", "pd", "down", "isdown", "pensize", "width", "pencolor",
    "fillcolor", "color", "circle", "dot", "write", "home", "clear", "reset",
    "speed", "hideturtle", "ht", "showturtle", "st", "begin_fill", "end_fill", "shape"
):
    setattr(_module, _name, getattr(_default_turtle, _name))

_module.done = lambda: None
_module.mainloop = lambda: None
_module.exitonclick = lambda: None
_module.bgcolor = _screen.bgcolor
_module.title = _screen.title
_module.setup = _screen.setup
_module.tracer = _screen.tracer
_module.update = _screen.update
_module.__all__ = [name for name in dir(_module) if not name.startswith("_")]
_sys.modules["turtle"] = _module
`

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

export function usesTurtle(code: string) {
  return /(^|\n)\s*(?:import\s+turtle\b|from\s+turtle\s+import\b)/m.test(code)
}

export async function runPythonCode(code: string, onOutput?: (output: string) => void) {
  const runtime = await loadRuntime(); const lines: string[] = []
  const push = (text: string) => { lines.push(text); onOutput?.(lines.join('\n')) }
  runtime.setStdout({ batched: push }); runtime.setStderr({ batched: push })
  if (usesTurtle(code)) await runtime.runPythonAsync(turtleCompatibilityLayer)
  await runtime.runPythonAsync(code)
  return lines.join('\n') || (usesTurtle(code) ? '海龟绘图运行完成，请查看上方画布。' : '程序运行完成（没有输出内容）。')
}
