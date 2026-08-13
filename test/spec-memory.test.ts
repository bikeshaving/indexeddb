/**
 * IndexedDB WPT tests against MemoryBackend
 *
 * Runs the WPT-style IndexedDB test suite against the in-memory backend.
 */

import {runIndexedDBTests} from "./support/runner.js";
import {IDBFactory, IDBKeyRange, MemoryBackend} from "../src/index.js";

runIndexedDBTests("MemoryBackend", {
	createFactory: () => new IDBFactory(new MemoryBackend()),
	IDBKeyRange,
});
