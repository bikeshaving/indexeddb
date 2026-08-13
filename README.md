# @b9g/indexeddb

**Spec-compliant IndexedDB for server runtimes, with pluggable in-memory and SQLite backends.**

A pure-TypeScript implementation of the [W3C IndexedDB API](https://www.w3.org/TR/IndexedDB/)
that runs on Node.js and Bun. Unlike test doubles such as `fake-indexeddb`, the
SQLite backend **persists** to disk, so the same IndexedDB code you write for the
browser works — and keeps its data — on the server.

## Features

- **Spec-compliant**: validated against the [Web Platform Tests](https://github.com/web-platform-tests/wpt) IndexedDB suite.
- **Pluggable backends**: `MemoryBackend` (pure JS, no dependencies) and `SQLiteBackend` (persistent).
- **Runs on Node and Bun**: the SQLite backend auto-detects `bun:sqlite` or `better-sqlite3`.
- **Full API surface**: transactions, cursors, indexes (including `multiEntry` and `unique`), key ranges, and order-preserving key encoding.
- **Correct concurrency**: readwrite transactions with overlapping scopes are serialized per the spec; readonly transactions overlap.
- **No web platform dependencies**: does not require the File System Access API or any browser globals.

## Installation

```bash
npm install @b9g/indexeddb
```

The `MemoryBackend` has no dependencies. For the `SQLiteBackend`:

- On **Bun**, nothing extra is needed — it uses the built-in `bun:sqlite`.
- On **Node.js**, install the optional peer dependency:

  ```bash
  npm install better-sqlite3
  ```

## Quick start

```javascript
import {IDBFactory} from "@b9g/indexeddb";
import {SQLiteBackend} from "@b9g/indexeddb/sqlite";

// One factory owns a directory of SQLite database files.
const indexedDB = new IDBFactory(new SQLiteBackend("./data"));

const db = await new Promise((resolve, reject) => {
	const request = indexedDB.open("my-app", 1);
	request.onupgradeneeded = () => {
		const store = request.result.createObjectStore("todos", {
			keyPath: "id",
			autoIncrement: true,
		});
		store.createIndex("by-done", "done", {unique: false});
	};
	request.onsuccess = () => resolve(request.result);
	request.onerror = () => reject(request.error);
});

const tx = db.transaction("todos", "readwrite");
tx.objectStore("todos").add({title: "Ship it", done: false});
```

The same code runs against the in-memory backend — swap the backend, keep the API:

```javascript
import {IDBFactory} from "@b9g/indexeddb";
import {MemoryBackend} from "@b9g/indexeddb/memory";

const indexedDB = new IDBFactory(new MemoryBackend());
```

## Backends

| Backend          | Persistence      | Dependencies                       | Best for                          |
| ---------------- | ---------------- | ---------------------------------- | --------------------------------- |
| `MemoryBackend`  | None (in-memory) | None                               | Tests, SSR, ephemeral state       |
| `SQLiteBackend`  | Disk (per file)  | `bun:sqlite` or `better-sqlite3`   | Persistent single-owner storage   |

## Scaling model

The `SQLiteBackend` is designed for **single-owner** databases. It keeps one shared,
refcounted SQLite handle per database name, and the transaction scheduler that
enforces spec ordering lives in-process. This means:

- It scales **vertically** — one process owns a database and serves it with WAL and
  sensible pragmas already configured.
- It does **not** coordinate across processes. Two processes writing the same file
  fall back to SQLite's `busy_timeout` and can contend.

To scale out, give each database a single owner (for example, one worker per
database) and shard ownership — rather than sharing a file across processes.

## Limitations

- **`Blob`/`File` values are not yet supported.** Values are serialized with Node's
  structured-clone (`node:v8`), which handles `Map`, `Set`, `Date`, `RegExp`,
  `ArrayBuffer`, and typed arrays, but not `Blob` or `File`.
- **The SQLite driver is synchronous.** Each operation runs on the calling thread;
  very large values block during serialization and write.

## Conformance

The suite is validated against the official
[Web Platform Tests](https://github.com/web-platform-tests/wpt) IndexedDB suite,
run against **both** backends. The real WPT `.any.js` files are fetched at a pinned
revision (sparse, blobless — a few MB, not the full WPT tree) and executed through a
small `testharness` shim.

```bash
bun run wpt:setup   # fetch the pinned WPT IndexedDB tests into ./wpt (once)
bun test            # runs unit tests + the WPT conformance suite
```

`bun run test` runs `wpt:setup` automatically first. The test layout:

| Files                     | What it runs                                             |
| ------------------------- | -------------------------------------------------------- |
| `test/*.test.ts`          | Unit tests for keys, cursors, transactions, backends     |
| `test/spec-*.test.ts`     | A hand-written spec suite, per backend                   |
| `test/wpt-*.test.ts`      | The real WPT `.any.js` files, per backend                |

## License

MIT © Brian Kim
