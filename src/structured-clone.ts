/**
 * Value serialization using the structured clone algorithm.
 *
 * Uses node:v8 serialize/deserialize, which works on Node and Bun. Bun's
 * implementation additionally preserves Blob and File (reading their bytes
 * synchronously in native code); Node's does not — it drops them to an empty
 * object. We probe the runtime once and, when it cannot preserve Blob/File,
 * refuse to store them rather than silently corrupt the data (fail closed).
 */

import {serialize, deserialize} from "node:v8";

// One-time probe: does this runtime's serializer round-trip a Blob?
const BLOB_SERIALIZABLE = (() => {
	try {
		if (typeof Blob === "undefined") return false;
		const round = deserialize(serialize({b: new Blob(["x"])})) as {b: unknown};
		return round.b instanceof Blob;
	} catch (_err) {
		return false;
	}
})();

/**
 * Walk a value looking for a Blob or File (File extends Blob). Mirrors the
 * shapes the structured serializer traverses, and guards against cycles.
 */
function containsBlob(value: unknown, seen: Set<object>): boolean {
	if (value === null || typeof value !== "object") return false;
	if (typeof Blob !== "undefined" && value instanceof Blob) return true;
	if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return false;
	if (seen.has(value)) return false;
	seen.add(value);
	if (Array.isArray(value)) {
		return value.some((v) => containsBlob(v, seen));
	}
	if (value instanceof Map) {
		for (const [k, v] of value) {
			if (containsBlob(k, seen) || containsBlob(v, seen)) return true;
		}
		return false;
	}
	if (value instanceof Set) {
		for (const v of value) {
			if (containsBlob(v, seen)) return true;
		}
		return false;
	}
	for (const key of Object.keys(value)) {
		if (containsBlob((value as Record<string, unknown>)[key], seen)) {
			return true;
		}
	}
	return false;
}

export function encodeValue(value: unknown): Uint8Array {
	// On Bun (BLOB_SERIALIZABLE) this branch is skipped entirely, so there is
	// no per-write traversal cost. Only runtimes that would corrupt Blob/File
	// pay for the check — and only to fail closed with a clear error.
	if (!BLOB_SERIALIZABLE && containsBlob(value, new Set())) {
		throw new DOMException(
			"Storing Blob or File values is not supported on this runtime: its " +
				"structured serializer does not preserve them. Run on Bun, or store " +
				"the bytes as an ArrayBuffer instead.",
			"DataCloneError",
		);
	}
	return serialize(value);
}

export function decodeValue(data: Uint8Array): unknown {
	return deserialize(data);
}
