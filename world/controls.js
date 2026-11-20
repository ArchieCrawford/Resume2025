/**
 * Desktop: WASD / arrows, Q and E to turn, click to pointer-lock mouse look.
 * Touch: on-screen joystick, drag-to-look, and a short tap to step forward.
 * The controller stays inert until `enabled` is set, so the seated intro
 * can ignore movement.
 */

const TURN_SPEED = 1.7;

export class WalkControls {
  constructor(domElement) {
    this.dom = domElement;
    this.enabled = false;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.joyX = 0;
    this.joyY = 0;
    this.tapTime = 0;
    this._locked = false;
    this._coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;

    this._onKeyDown = (event) => this.onKey(event, true);
    this._onKeyUp = (event) => this.onKey(event, false);
    this._onMouse = (event) => this.onMouse(event);
    this._onClick = () => this.onClick();
    this._onLockChange = () => {
      this._locked = document.pointerLockElement === this.dom;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouse);
    document.addEventListener('pointerlockchange', this._onLockChange);
    this.dom.addEventListener('click', this._onClick);

    this.ui = null;
    if (this._coarse) this.mountTouch();
  }

  onKey(event, down) {
    const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'];
    if (!moveKeys.includes(event.code)) return;
    if (down) this.keys.add(event.code);
    else this.keys.delete(event.code);
    if (this.enabled) event.preventDefault();
  }

  onMouse(event) {
    if (!this.enabled || !this._locked) return;
    this.yaw -= event.movementX * 0.0022;
    this.pitch -= event.movementY * 0.002;
    this.pitch = clamp(this.pitch, -0.7, 0.55);
  }

  onClick() {
    if (!this.enabled || this._coarse) return;
    const target = document.activeElement;
    if (target && target.closest && target.closest('button, a, input, textarea')) return;
    if (document.pointerLockElement !== this.dom) {
      this.dom.requestPointerLock?.();
    }
  }

  mountTouch() {
    const root = document.createElement('div');
    root.id = 'walk-touch';
    root.innerHTML = `
      <div id="walk-joystick" aria-hidden="true"><div id="walk-joystick-knob"></div></div>
      <div id="walk-lookpad" aria-hidden="true"></div>
    `;
    document.body.appendChild(root);
    this.ui = root;
    const stick = root.querySelector('#walk-joystick');
    const knob = root.querySelector('#walk-joystick-knob');
    const pad = root.querySelector('#walk-lookpad');

    const moveStick = (clientX, clientY) => {
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
    const resetStick = () => {
      knob.style.transform = 'translate(0, 0)';
      this.joyX = 0;
      this.joyY = 0;
    };

    stick.addEventListener('pointerdown', (event) => {
      stick.setPointerCapture(event.pointerId);
      moveStick(event.clientX, event.clientY);
    });
    stick.addEventListener('pointermove', (event) => {
      if (stick.hasPointerCapture(event.pointerId)) moveStick(event.clientX, event.clientY);
    });
    stick.addEventListener('pointerup', resetStick);
    stick.addEventListener('pointercancel', resetStick);

    let last = null;
    let start = null;
    pad.addEventListener('pointerdown', (event) => {
      pad.setPointerCapture(event.pointerId);
      last = { x: event.clientX, y: event.clientY };
      start = { x: event.clientX, y: event.clientY };
    });
    pad.addEventListener('pointermove', (event) => {
      if (!last || !pad.hasPointerCapture(event.pointerId) || !this.enabled) return;
      this.yaw -= (event.clientX - last.x) * 0.005;
      this.pitch -= (event.clientY - last.y) * 0.004;
      this.pitch = clamp(this.pitch, -0.7, 0.55);
      last = { x: event.clientX, y: event.clientY };
    });
    pad.addEventListener('pointerup', (event) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 14) {
        this.tapTime = 0.45;
      }
      last = null;
      start = null;
    });
  }

  /**
   * Camera-relative wish direction, already normalized when moving.
   * y of the returned vector is unused (movement is planar).
   */
  readMove(dt) {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyQ')) this.yaw += TURN_SPEED * dt;
    if (this.keys.has('KeyE')) this.yaw -= TURN_SPEED * dt;

    x += this.joyX;
    z += -this.joyY;
    if (this.tapTime > 0) {
      z += 1;
      this.tapTime = Math.max(0, this.tapTime - dt);
    }

    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    return {
      x: sin * z + cos * x,
      z: cos * z - sin * x,
      moving: len > 0.08,
    };
  }

  setVisible(visible) {
    if (this.ui) this.ui.style.display = visible ? '' : 'none';
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouse);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    this.dom.removeEventListener('click', this._onClick);
    this.exitLock();
    this.ui?.remove();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
