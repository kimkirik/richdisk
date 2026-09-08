// Visibility suspends the frame loop, not the player's pause choice.
// Use the current game so changing stages cannot leave a stale pause behind.
export function bindPageLifecycle({
  page,
  host,
  getGame,
  audio,
  resetClock,
  refresh,
}) {
  const sync = () => {
    getGame().accumulator = 0;
    resetClock();
    audio.setScene(getGame(), page.hidden);
    refresh();
  };
  page.addEventListener("visibilitychange", sync);
  host.addEventListener("pageshow", sync);
  host.addEventListener("focus", sync);
  return () => {
    page.removeEventListener("visibilitychange", sync);
    host.removeEventListener("pageshow", sync);
    host.removeEventListener("focus", sync);
  };
}
