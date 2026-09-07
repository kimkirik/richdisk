// A quarter-turn preserves every path, distance and build pad on a portrait board.
export const PORTRAIT_QUERY = "(max-width: 900px) and (orientation: portrait)";
export function projectPoint(point, portrait) {
  return portrait
    ? { x: 720 - point.y, y: point.x }
    : { x: point.x, y: point.y };
}
export function padPercent(point, portrait) {
  const p = projectPoint(point, portrait);
  return {
    left: (p.x / (portrait ? 720 : 1280)) * 100,
    top: (p.y / (portrait ? 1280 : 720)) * 100,
  };
}
export function cameraMatrix(width, height, portrait) {
  return portrait
    ? [0, height / 1280, -width / 720, 0, width, 0]
    : [width / 1280, 0, 0, height / 720, 0, 0];
}
export function upright(ctx, x, y, portrait) {
  if (!portrait) return;
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-x, -y);
}
