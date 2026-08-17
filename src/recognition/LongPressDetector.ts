import type { Point } from './types';

const LONG_PRESS_MS = 600;
const MAX_MOVE_PX = 8;

export class LongPressDetector {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private startPos: Point | null = null;
  private onLongPress: (pos: Point) => void;

  constructor(onLongPress: (pos: Point) => void) {
    this.onLongPress = onLongPress;
  }

  start(pos: Point): void {
    this.cancel();
    this.startPos = pos;
    this.timer = setTimeout(() => {
      this.onLongPress(pos);
      this.timer = null;
    }, LONG_PRESS_MS);
  }

  move(pos: Point): void {
    if (!this.startPos) return;
    const dx = pos.x - this.startPos.x;
    const dy = pos.y - this.startPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > MAX_MOVE_PX) {
      this.cancel();
    }
  }

  end(): void {
    this.cancel();
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.startPos = null;
  }
}
