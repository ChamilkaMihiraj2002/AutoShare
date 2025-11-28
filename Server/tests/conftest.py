import os
import sys
import pytest

# Ensure the `Server` package directory is on sys.path so tests can import `app`
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


class FakeInsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class FakeUpdateResult:
    def __init__(self, matched_count: int):
        self.matched_count = matched_count


class FakeDeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class FakeCollection:
    def __init__(self):
        self._store = {}

    class FakeCursor:
        def __init__(self, docs):
            self._docs = docs

        async def to_list(self, length: int):
            # honor length similar to motor's cursor.to_list
            if length is None:
                return list(self._docs)
            return list(self._docs)[:length]

    async def insert_one(self, doc: dict):
        _id = doc.get("_id")
        # emulate Mongo behavior: store and return inserted id
        self._store[_id] = doc
        return FakeInsertOneResult(inserted_id=_id)

    async def find_one(self, query: dict):
        _id = query.get("_id")
        return self._store.get(_id)

    def find(self, filter_q: dict):
        # return an async-like cursor with `to_list` method
        # support filter by owner_uid or empty filter
        if not filter_q:
            docs = list(self._store.values())
        else:
            # simple exact-match filtering for keys present in filter_q
            docs = [d for d in self._store.values() if all(d.get(k) == v for k, v in filter_q.items())]
        return FakeCollection.FakeCursor(docs)

    async def update_one(self, filter_q: dict, update_q: dict):
        _id = filter_q.get("_id")
        if _id not in self._store:
            return FakeUpdateResult(matched_count=0)
        # apply $set updates
        set_ops = update_q.get("$set", {})
        self._store[_id].update(set_ops)
        return FakeUpdateResult(matched_count=1)

    async def delete_one(self, filter_q: dict):
        _id = filter_q.get("_id")
        if _id in self._store:
            del self._store[_id]
            return FakeDeleteResult(deleted_count=1)
        return FakeDeleteResult(deleted_count=0)


class FakeDB:
    def __init__(self):
        # lazy-created collections
        self._collections = {}

    def __getitem__(self, name: str):
        if name not in self._collections:
            self._collections[name] = FakeCollection()
        return self._collections[name]


@pytest.fixture
def fake_db():
    """Provides a simple fake AsyncIOMotorDatabase compatible object."""
    return FakeDB()
