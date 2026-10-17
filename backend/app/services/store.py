import threading
from collections import OrderedDict

from app.models import RunResult


class ResultStore:
    def __init__(self, max_size: int = 200):
        self._store: OrderedDict[str, RunResult] = OrderedDict()
        self._lock = threading.Lock()
        self._max_size = max_size

    def save(self, run_id: str, result: RunResult):
        with self._lock:
            if run_id in self._store:
                self._store.move_to_end(run_id)
            self._store[run_id] = result
            if len(self._store) > self._max_size:
                self._store.popitem(last=False)  # Evict oldest entry (FIFO/LRU)

    def get(self, run_id: str) -> RunResult | None:
        with self._lock:
            result = self._store.get(run_id)
            if result is not None:
                self._store.move_to_end(run_id)
            return result
            
    def delete(self, run_id: str):
        with self._lock:
            if run_id in self._store:
                del self._store[run_id]

    def clear(self):
        with self._lock:
            self._store.clear()

# Singleton instance for the application
store = ResultStore()
