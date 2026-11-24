export const SNAPSHOT_MATCH_WINDOW_MS = 60 * 60 * 1000;

export function findNearestSnapshot<T extends { capturedAt: Date }>(
  snapshots: readonly T[],
  target: Date,
): T | undefined {
  const targetTime = target.getTime();
  if (!Number.isFinite(targetTime)) return undefined;

  let nearest: T | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const snapshot of snapshots) {
    const capturedAt = snapshot.capturedAt.getTime();
    if (!Number.isFinite(capturedAt)) continue;

    const distance = Math.abs(capturedAt - targetTime);
    if (distance > SNAPSHOT_MATCH_WINDOW_MS) continue;

    if (
      distance < nearestDistance ||
      (distance === nearestDistance && nearest && capturedAt < nearest.capturedAt.getTime())
    ) {
      nearest = snapshot;
      nearestDistance = distance;
    }
  }

  return nearest;
}
