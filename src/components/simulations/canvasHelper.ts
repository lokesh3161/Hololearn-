export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): { width: number; height: number } {
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 750;
  const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 480;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { width: w, height: h };
}
