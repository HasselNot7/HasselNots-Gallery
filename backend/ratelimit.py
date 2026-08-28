"""Simple in-process sliding-window rate limiter.

State lives in a single worker process — restarts reset limits, and multiple
workers do not share them. Entries are swept periodically so abandoned keys
do not grow without bound.

Windows must not exceed _SWEEP_MAX_WINDOW, or sweep will drop still-relevant
events.
"""
import time

_SWEEP_MAX_WINDOW = 3600

_buckets: dict[str, list[float]] = {}
_last_sweep = 0.0


def _sweep(now: float) -> None:
    global _last_sweep
    if now - _last_sweep < 60:
        return
    _last_sweep = now
    for key in list(_buckets):
        recent = [t for t in _buckets[key] if now - t < _SWEEP_MAX_WINDOW]
        if recent:
            _buckets[key] = recent
        else:
            _buckets.pop(key, None)


def blocked(key: str, max_events: int, window_seconds: int) -> int:
    """Seconds until a slot frees up, or 0 if one is available now."""
    now = time.time()
    _sweep(now)
    events = [t for t in _buckets.get(key, []) if now - t < window_seconds]
    _buckets[key] = events
    if len(events) >= max_events:
        return max(int(window_seconds - (now - events[0])) + 1, 1)
    return 0


def record(key: str, window_seconds: int) -> None:
    """Append one event to the sliding window."""
    now = time.time()
    events = [t for t in _buckets.get(key, []) if now - t < window_seconds]
    events.append(now)
    _buckets[key] = events


def reset(key: str) -> None:
    _buckets.pop(key, None)
