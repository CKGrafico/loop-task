// ============================================================
// loop-task landing — copy buttons, terminal animation, reveals
// ============================================================

// ---------- Copy buttons ----------
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy)
      btn.classList.add('copied')
      setTimeout(() => btn.classList.remove('copied'), 2000)
    } catch {
      /* clipboard unavailable — ignore */
    }
  })
})

// ---------- Scroll reveal ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!reduceMotion && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12 }
  )
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el))
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'))
}

// ---------- Board spinner (mimics ink-spinner dots) ----------
const spinner = document.querySelector('.b-spinner')
if (spinner && !reduceMotion) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let f = 0
  setInterval(() => {
    spinner.textContent = frames[f = (f + 1) % frames.length]
  }, 90)
}

// ---------- Terminal typing animation ----------
// Each line: [cssClass, text, perCharDelayMs]. 'br' = newline.
const LINES = [
  ['t-prompt', '$ ', 0],
  [null, 'loop-task new 30m -- npm test', 32],
  ['br', '', 0],
  ['t-ok', '✓ ', 0],
  ['t-dim', 'loop created · runs every ', 6],
  ['t-brand', '30m', 30],
  ['br', '', 0],
  ['br', '', 0],
  ['t-prompt', '$ ', 0],
  [null, 'loop-task new 10s -- curl -sf https://example.com/health', 22],
  ['br', '', 0],
  ['t-ok', '✓ ', 0],
  ['t-dim', 'loop created · runs every ', 6],
  ['t-brand', '10s', 30],
  ['br', '', 0],
  ['br', '', 0],
  ['t-prompt', '$ ', 0],
  [null, 'loop-task status', 40],
  ['br', '', 0],
  ['t-loop', '  ⠸ npm test        ', 6],
  ['t-ok', 'running', 14],
  ['t-dim', '   next in 29m 47s\n', 6],
  ['t-loop', '  ● health check    ', 6],
  ['t-ok', 'running', 14],
  ['t-dim', '   next in 4s\n\n', 6],
  ['t-dim', '  loops keep running after you close this terminal ', 8],
  ['t-brand', '🧵', 0],
]

const terminalBody = document.getElementById('terminal-body')

function runTerminal() {
  const cursor = document.createElement('span')
  cursor.className = 't-cursor'
  terminalBody.appendChild(cursor)

  let lineIdx = 0

  function nextLine() {
    if (lineIdx >= LINES.length) return

    const [cls, text, delay] = LINES[lineIdx++]

    if (cls === 'br') {
      cursor.insertAdjacentText('beforebegin', '\n')
      nextLine()
      return
    }

    const span = document.createElement('span')
    if (cls) span.className = cls
    cursor.insertAdjacentElement('beforebegin', span)

    if (delay === 0 || reduceMotion) {
      span.textContent = text
      nextLine()
      return
    }

    let charIdx = 0
    const timer = setInterval(() => {
      span.textContent += text[charIdx++]
      if (charIdx >= text.length) {
        clearInterval(timer)
        nextLine()
      }
    }, delay)
  }

  nextLine()
}

if (terminalBody) {
  if ('IntersectionObserver' in window) {
    const terminalObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          terminalObserver.disconnect()
          runTerminal()
        }
      },
      { threshold: 0.3 }
    )
    terminalObserver.observe(terminalBody)
  } else {
    runTerminal()
  }
}
