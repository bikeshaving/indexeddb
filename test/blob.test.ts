/**
 * Blob and File value support.
 *
 * On Bun, node:v8 preserves Blob/File (bytes, type, name, lastModified)
 * through both backends. These tests lock that in. On a runtime whose
 * serializer cannot preserve them, encodeValue fails closed with a
 * DataCloneError rather than storing a corrupted value.
 */

import {describe, it, expect, beforeEach, afterEach} from "bun:test";
import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {IDBFactory} from "../src/factory.js";
import {MemoryBackend} from "../src/memory.js";
import {SQLiteBackend} from "../src/sqlite.js";

function openDB(factory: IDBFactory): Promise<any> {
	return new Promise((resolve, reject) => {
		const req = factory.open("blobs", 1);
		req.onupgradeneeded = () => req.result.createObjectStore("store");
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function put(db: any, key: string, value: unknown): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction("store", "readwrite");
		tx.objectStore("store").put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

function get(db: any, key: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const req = db
			.transaction("store", "readonly")
			.objectStore("store")
			.get(key);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

const backends: Array<[string, () => any]> = [
	["MemoryBackend", () => new MemoryBackend()],
	[
		"SQLiteBackend",
		() => new SQLiteBackend(mkdtempSync(join(tmpdir(), "idb-blob-"))),
	],
];

for (const [name, make] of backends) {
	describe(`Blob/File values: ${name}`, () => {
		let factory: IDBFactory;
		let tempDirs: string[];

		beforeEach(() => {
			tempDirs = [];
			const backend = make();
			factory = new IDBFactory(backend);
		});

		afterEach(() => {
			for (const dir of tempDirs) {
				try {
					rmSync(dir, {recursive: true, force: true});
				} catch (_) {
					// ignore
				}
			}
		});

		it("round-trips a Blob (bytes + type)", async () => {
			const db = await openDB(factory);
			// Compare against the source Blob's own type — the runtime may
			// normalize "text/plain" (Bun appends ";charset=utf-8"); what we
			// verify is that the round-trip preserves it faithfully.
			const source = new Blob(["hello blob"], {type: "text/plain"});
			await put(db, "b", source);
			const out = await get(db, "b");
			expect(out).toBeInstanceOf(Blob);
			expect(out.type).toBe(source.type);
			expect(await out.text()).toBe("hello blob");
			db.close();
		});

		it("round-trips a File (name + lastModified)", async () => {
			const db = await openDB(factory);
			await put(
				db,
				"f",
				new File(["file data"], "note.txt", {
					type: "text/plain",
					lastModified: 1234,
				}),
			);
			const out = await get(db, "f");
			expect(out).toBeInstanceOf(File);
			expect(out.name).toBe("note.txt");
			expect(out.lastModified).toBe(1234);
			expect(await out.text()).toBe("file data");
			db.close();
		});

		it("round-trips Blobs nested in objects and arrays", async () => {
			const db = await openDB(factory);
			const blob = new Blob(["nested"], {type: "application/octet-stream"});
			const file = new File(["arr"], "a.bin");
			await put(db, "deep", {meta: {blob}, items: [file, 1, "x"]});
			const out = await get(db, "deep");
			expect(out.meta.blob).toBeInstanceOf(Blob);
			expect(await out.meta.blob.text()).toBe("nested");
			expect(out.items[0]).toBeInstanceOf(File);
			expect(out.items[0].name).toBe("a.bin");
			expect(out.items[1]).toBe(1);
			db.close();
		});

		it("preserves binary bytes exactly", async () => {
			const db = await openDB(factory);
			const bytes = new Uint8Array([0, 255, 1, 254, 128, 127]);
			await put(db, "bin", new Blob([bytes]));
			const out = await get(db, "bin");
			const back = new Uint8Array(await out.arrayBuffer());
			expect(Array.from(back)).toEqual(Array.from(bytes));
			db.close();
		});
	});
}
