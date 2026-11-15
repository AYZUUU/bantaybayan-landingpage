export function listenForClusterTaps(
  container: HTMLElement,
  openCluster: (element: Element) => boolean,
) {
  let start: { element: Element; id: number; x: number; y: number; time: number } | null = null;

  const onStart = (event: TouchEvent) => {
    start = null;
    if (event.touches.length !== 1 || !(event.target instanceof Element)) return;
    const element = event.target.closest(".incident-map-cluster, .incident-map-expanded-cluster");
    if (!element || !container.contains(element)) return;
    const touch = event.touches[0];
    start = { element, id: touch.identifier, x: touch.clientX, y: touch.clientY, time: event.timeStamp };
  };
  const onEnd = (event: TouchEvent) => {
    const initial = start;
    start = null;
    if (!initial || event.touches.length !== 0 || event.timeStamp - initial.time > 500) return;
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === initial.id);
    if (!touch || Math.hypot(touch.clientX - initial.x, touch.clientY - initial.y) > 8) return;
    if (openCluster(initial.element)) event.preventDefault();
  };
  const onCancel = () => { start = null; };

  container.addEventListener("touchstart", onStart, { passive: true });
  container.addEventListener("touchend", onEnd, { passive: false });
  container.addEventListener("touchcancel", onCancel);
  return () => {
    container.removeEventListener("touchstart", onStart);
    container.removeEventListener("touchend", onEnd);
    container.removeEventListener("touchcancel", onCancel);
  };
}
