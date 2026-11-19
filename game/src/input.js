// Keyboard and mouse state. Systems poll `keys` each frame and use
// `pressed(code)` for one-shot actions (it clears itself every frame end).

const keys = new Set();
const pressedSet = new Set();

export function initInput(canvas, mouse) {
  window.addEventListener('keydown', (event) => {
    if (!keys.has(event.code)) pressedSet.add(event.code);
    keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) mouse.down = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

export function down(...codes) {
  return codes.some((code) => keys.has(code));
}

export function pressed(code) {
  return pressedSet.has(code);
}

export function endFrame() {
  pressedSet.clear();
}
