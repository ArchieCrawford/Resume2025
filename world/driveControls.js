/**
 * Keyboard and touch input for the kart.
 * Joystick X steers, joystick Y accelerates. Pedals are an alternate
 * for thumbs that do not want both axes on one stick.
 * Inert until `enabled` is set, so walking and the seated intro ignore it.
 */

export class DriveControls {
  constructor() {
    this.enabled = false;
    this.keys = new Set();
    this.joyX = 0;
    this.joyY = 0;
    this.goHeld = false;
    this.stopHeld = false;
    this.coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
    this.ui = null;

    this._onKeyDown = (event) => this.onKey(event, true);
    this._onKeyUp = (event) => this.onKey(event, false);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    if (this.coarse) this.mountTouch();
  }

  onKey(event, down) {
    const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    if (!codes.includes(event.code)) return;
    const typing = event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA');
    if (typing) return;
    if (down) this.keys.add(event.code);
    else this.keys.delete(event.code);
    if (this.enabled) event.preventDefault();
  }

  mountTouch() {
    const root = document.createElement('div');
    root.id = 'drive-touch';
    root.innerHTML = `
      <div id="drive-joystick" aria-hidden="true"><div id="drive-joystick-knob"></div></div>
      <div id="drive-pedals">
        <button type="button" id="drive-go">Go</button>
        <button type="button" id="drive-stop">Brake</button>
      </div>
    `;
    document.body.appendChild(root);
    this.ui = root;
    const stick = root.querySelector('#drive-joystick');
    const knob = root.querySelector('#drive-joystick-knob');
    const move = (clientX, clientY) => {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = rect.width * 0.38;
      const mag = Math.hypot(dx, dy) || 1;
      if (mag > max) {
        dx = (dx / mag) * max;
        dy = (dy / mag) * max;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joyX = dx / max;
      this.joyY = dy / max;
    };
    const reset = () => {
      knob.style.transform = 'translate(0, 0)';
      this.joyX = 0;
      this.joyY = 0;
    };
    const bindStick = (event) => {
      stick.setPointerCapture(event.pointerId);
      move(event.clientX, event.clientY);
      event.preventDefault();
    };
    stick.addEventListener('pointerdown', bindStick);
    stick.addEventListener('pointermove', (event) => {
      if (stick.hasPointerCapture(event.pointerId)) move(event.clientX, event.clientY);
    });
    stick.addEventListener('pointerup', reset);
    stick.addEventListener('pointercancel', reset);

    this.bindPedal(root.querySelector('#drive-go'), (held) => { this.goHeld = held; });
    this.bindPedal(root.querySelector('#drive-stop'), (held) => { this.stopHeld = held; });
    root.style.display = 'none';
  }

  bindPedal(button, setHeld) {
    const down = (event) => {
      button.setPointerCapture(event.pointerId);
      setHeld(true);
      event.preventDefault();
    };
    const up = () => setHeld(false);
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
  }

  read() {
    if (!this.enabled) return { throttle: 0, steer: 0, brake: 0 };
    let throttle = 0;
    let steer = 0;
    let brake = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer -= 1;
    if (this.keys.has('Space')) brake = 1;
    steer += this.joyX;
    throttle += -this.joyY;
    if (this.goHeld) throttle += 1;
    if (this.stopHeld) {
      brake = 1;
      throttle = Math.min(throttle, 0);
    }
    return {
      throttle: clamp(throttle, -1, 1),
      steer: clamp(steer, -1, 1),
      brake,
    };
  }

  setVisible(visible) {
    if (this.ui) this.ui.style.display = visible ? '' : 'none';
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.ui?.remove();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
