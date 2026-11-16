export class InputController {
  keys: Record<string, boolean> = {};
  mouseDown = false;
  rightMouseDown = false;
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  pointerLocked = false;
  private justPressedKeys: Set<string> = new Set();
  private justPressedMouse = false;
  private justPressedRightMouse = false;
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.keys[e.code]) this.justPressedKeys.add(e.code);
    this.keys[e.code] = true;
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keys[e.code] = false; };
  private onMouseMove = (e: MouseEvent) => {
    if (this.pointerLocked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
  };
  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) { if (!this.mouseDown) this.justPressedMouse = true; this.mouseDown = true; }
    if (e.button === 2) { if (!this.rightMouseDown) this.justPressedRightMouse = true; this.rightMouseDown = true; }
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.rightMouseDown = false;
  };
  private onWheel = (e: WheelEvent) => { this.wheel += e.deltaY; };
  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.el;
  };

  requestPointerLock() {
    // Browsers reject this (e.g. right after Esc, or inside iframes); the next click retries.
    try {
      const p = this.el.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.(() => {});
    } catch {
      /* not allowed right now */
    }
  }
  exitPointerLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  isDown(code: string): boolean { return !!this.keys[code]; }
  wasPressed(code: string): boolean { return this.justPressedKeys.has(code); }
  wasMousePressed(): boolean { return this.justPressedMouse; }
  wasRightMousePressed(): boolean { return this.justPressedRightMouse; }

  consumeMouseDelta(): { dx: number; dy: number } {
    const r = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0; this.mouseDY = 0;
    return r;
  }
  consumeWheel(): number { const w = this.wheel; this.wheel = 0; return w; }

  endFrame() {
    this.justPressedKeys.clear();
    this.justPressedMouse = false;
    this.justPressedRightMouse = false;
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
