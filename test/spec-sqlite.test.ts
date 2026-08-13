/**
 * IndexedDB WPT tests against SQLiteBackend
 *
 * Runs the WPT-style IndexedDB test suite against the SQLite backend
 * to verify persistence and backend compatibility.
 */

import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterAll} from "bun:test";
import {runIndexedDBTests} from "./support/runner.js";
import {IDBFactory, IDBKeyRange} from "../src/index.js";
import {SQLiteBackend} from "../src/sqlite.js";

// Create a temp directory for SQLite files
const tempDir = mkdtempSync(join(tmpdir(), "wpt-idb-sqlite-"));

afterAll(() => {
	rmSync(tempDir, {recursive: true, force: true});
});

runIndexedDBTests("SQLiteBackend", {
	createFactory: () => new IDBFactory(new SQLiteBackend(tempDir)),
	IDBKeyRange,
});
