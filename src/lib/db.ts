import JSZip from 'jszip';

interface FileSystemWritableFileStream extends WritableStream {
	write(data: BufferSource | Blob | string): Promise<void>;
	close(): Promise<void>;
}

interface FileSystemFileHandle {
	getFile(): Promise<File>;
	createWritable(): Promise<FileSystemWritableFileStream>;
}

interface SaveFilePickerOptions {
	suggestedName?: string;
	types?: Array<{
		description?: string;
		accept: Record<string, string[]>;
	}>;
}

interface OpenFilePickerOptions {
	types?: Array<{
		description?: string;
		accept: Record<string, string[]>;
	}>;
	multiple?: boolean;
}

declare global {
	interface Window {
		showSaveFilePicker(
			options?: SaveFilePickerOptions,
		): Promise<FileSystemFileHandle>;
		showOpenFilePicker(
			options?: OpenFilePickerOptions,
		): Promise<FileSystemFileHandle[]>;
	}
}
import { sampleClusters, sampleEdges } from './sample-data';
import type { Block, BlockType, Cluster, ClusterEdge } from './types';

export const isTauri = () => {
	// @ts-ignore
	return window.__TAURI_INTERNALS__ !== undefined;
};

let _convertFileSrc: ((path: string) => string) | null = null;
void (async () => {
	if (isTauri()) {
		const mod = await import('@tauri-apps/api/core');
		_convertFileSrc = mod.convertFileSrc;
	}
})();

export const getAssetUrl = (localPath: string): string => {
	if (!localPath || typeof localPath !== 'string') return '';
	if (
		localPath.startsWith('http') ||
		localPath.startsWith('blob') ||
		localPath.startsWith('data:') ||
		localPath.startsWith('asset://')
	) {
		return localPath;
	}
	// On first call the async init may not be done yet; return as-is.
	// After that, _convertFileSrc is set and we use it.
	if (_convertFileSrc) return _convertFileSrc(localPath);
	return localPath;
};

export async function cacheAsset(url: string): Promise<string> {
	if (!isTauri() || !url || !url.startsWith('http')) return url;
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		const localPath = await invoke<string>('download_asset', { url });
		return localPath;
	} catch (e) {
		console.error('Failed to cache asset', e);
		return url;
	}
}

// Singleton DB instance
type SqliteDatabase = {
	execute(sql: string, args?: unknown[]): Promise<unknown>;
	select<T>(sql: string, args?: unknown[]): Promise<T>;
};
let dbInstance: SqliteDatabase | null = null;

const WEB_STORAGE_KEY = 'korkboard:web-state';

interface WebState {
	clusters: Cluster[];
	edges: ClusterEdge[];
}

function getWebState(): WebState {
	try {
		const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch (e) {
		console.error('Failed to parse web state', e);
	}
	return {
		clusters: sampleClusters.map((c) => ({
			...c,
			blocks: c.blocks.map((b) => ({ ...b })),
		})),
		edges: sampleEdges.map((e) => ({ ...e })),
	};
}

function saveWebState(state: WebState) {
	window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state));
}

interface ClusterRow {
	id: string;
	title: string;
	description: string | null;
	tags: string | null;
	note: string | null;
	color_label: string | null;
	created_at: string;
	updated_at: string | null;
}

interface BlockRow {
	id: string;
	cluster_id: string;
	type: string;
	title: string;
	description: string | null;
	url: string | null;
	image_url: string | null;
	author: string | null;
	content: string | null;
	tags: string | null;
	note: string | null;
	color_label: string | null;
	created_at: string;
	updated_at: string | null;
}

interface EdgeRow {
	id: string;
	source_id: string;
	target_id: string;
}

export async function getDb(): Promise<SqliteDatabase> {
	if (dbInstance) return dbInstance;
	if (!isTauri()) throw new Error('SQLite not available on web');
	const Database = (await import('@tauri-apps/plugin-sql')).default;
	dbInstance = await Database.load('sqlite:korkboard.db');

	await dbInstance.execute(`
		CREATE TABLE IF NOT EXISTS clusters (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT,
			tags TEXT,
			note TEXT,
			color_label TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT
		);
	`);

	await dbInstance.execute(`
		CREATE TABLE IF NOT EXISTS blocks (
			id TEXT PRIMARY KEY,
			cluster_id TEXT NOT NULL,
			type TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			url TEXT,
			image_url TEXT,
			author TEXT,
			content TEXT,
			tags TEXT,
			note TEXT,
			color_label TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT,
			FOREIGN KEY(cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
		);
	`);

	await dbInstance.execute(`
		CREATE TABLE IF NOT EXISTS cluster_edges (
			id TEXT PRIMARY KEY,
			source_id TEXT NOT NULL,
			target_id TEXT NOT NULL,
			FOREIGN KEY(source_id) REFERENCES clusters(id) ON DELETE CASCADE,
			FOREIGN KEY(target_id) REFERENCES clusters(id) ON DELETE CASCADE
		);
	`);

	return dbInstance;
}

export async function loadClusters(): Promise<{
	clusters: Cluster[];
	edges: ClusterEdge[];
}> {
	if (!isTauri()) return getWebState();

	const db = await getDb();

	const dbClusters = await db.select<ClusterRow[]>(
		'SELECT * FROM clusters ORDER BY created_at DESC',
	);
	const dbBlocks = await db.select<BlockRow[]>(
		'SELECT * FROM blocks ORDER BY created_at DESC',
	);
	const dbEdges = await db.select<EdgeRow[]>('SELECT * FROM cluster_edges');

	const blocksByCluster = new Map<string, Block[]>();
	for (const b of dbBlocks) {
		const blocks = blocksByCluster.get(b.cluster_id) || [];
		blocks.push({
			id: b.id,
			type: b.type as BlockType,
			title: b.title,
			description: b.description ?? undefined,
			url: b.url ?? undefined,
			imageUrl: b.image_url ?? undefined,
			author: b.author ?? undefined,
			content: b.content ?? undefined,
			tags: b.tags ? JSON.parse(b.tags) : [],
			note: b.note ?? undefined,
			colorLabel: b.color_label ?? undefined,
			createdAt: b.created_at,
			updatedAt: b.updated_at ?? undefined,
		});
		blocksByCluster.set(b.cluster_id, blocks);
	}

	const clusters: Cluster[] = dbClusters.map((c) => ({
		id: c.id,
		title: c.title,
		description: c.description ?? undefined,
		tags: c.tags ? JSON.parse(c.tags) : [],
		note: c.note ?? undefined,
		colorLabel: c.color_label ?? undefined,
		blocks: blocksByCluster.get(c.id) || [],
		createdAt: c.created_at,
		updatedAt: c.updated_at ?? undefined,
	}));

	const edges: ClusterEdge[] = dbEdges.map((e) => ({
		id: e.id,
		sourceId: e.source_id,
		targetId: e.target_id,
	}));

	return { clusters, edges };
}

export async function saveClusterData(
	clusters: Cluster[],
	edges: ClusterEdge[],
) {
	if (!isTauri()) {
		saveWebState({ clusters, edges });
		return;
	}

	const db = await getDb();

	await db.execute('BEGIN TRANSACTION');
	try {
		await db.execute('DELETE FROM cluster_edges');
		await db.execute('DELETE FROM blocks');
		await db.execute('DELETE FROM clusters');

		for (const c of clusters) {
			await db.execute(
				'INSERT INTO clusters (id, title, description, tags, note, color_label, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
				[
					c.id,
					c.title,
					c.description ?? null,
					JSON.stringify(c.tags ?? []),
					c.note ?? null,
					c.colorLabel ?? null,
					c.createdAt,
					c.updatedAt ?? null,
				],
			);

			for (const b of c.blocks) {
				await db.execute(
					'INSERT INTO blocks (id, cluster_id, type, title, description, url, image_url, author, content, tags, note, color_label, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
					[
						b.id,
						c.id,
						b.type,
						b.title,
						b.description ?? null,
						b.url ?? null,
						b.imageUrl ?? null,
						b.author ?? null,
						b.content ?? null,
						JSON.stringify(b.tags ?? []),
						b.note ?? null,
						b.colorLabel ?? null,
						b.createdAt,
						b.updatedAt ?? null,
					],
				);
			}
		}

		for (const e of edges) {
			await db.execute(
				'INSERT INTO cluster_edges (id, source_id, target_id) VALUES ($1, $2, $3)',
				[e.id, e.sourceId, e.targetId],
			);
		}
		await db.execute('COMMIT');
	} catch (error) {
		await db.execute('ROLLBACK');
		console.error('Failed to save cluster data', error);
		throw error;
	}
}

// --- Web Import/Export (File System Access API + JSZip) ---

export async function webExportCluster(cluster: Cluster): Promise<void> {
	const zip = new JSZip();

	const clusterJson = JSON.stringify(cluster);
	zip.file('board.json', clusterJson);

	const blob = await zip.generateAsync({
		type: 'blob',
		compression: 'DEFLATE',
		compressionOptions: { level: 6 },
	});

	const filename = `${cluster.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.kork`;

	if ('showSaveFilePicker' in window) {
		try {
			const handle = await window.showSaveFilePicker({
				suggestedName: filename,
				types: [
					{
						description: 'Korkboard Archive',
						accept: { 'application/zip': ['.kork'] },
					},
				],
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
		} catch (e) {
			if ((e as Error).name === 'AbortError') return;
			throw e;
		}
	} else {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}

export async function webImportCluster(): Promise<Cluster | null> {
	let fileHandle: FileSystemFileHandle | null = null;
	let file: File;

	if ('showOpenFilePicker' in window) {
		try {
			const [handle] = await window.showOpenFilePicker({
				types: [
					{
						description: 'Korkboard Archive',
						accept: { 'application/zip': ['.kork'] },
					},
				],
				multiple: false,
			});
			fileHandle = handle;
			file = await handle.getFile();
		} catch (e) {
			if ((e as Error).name === 'AbortError') return null;
			throw e;
		}
	} else {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.kork';

		file = await new Promise<File>((resolve, reject) => {
			input.onchange = () => {
				const f = input.files?.[0];
				if (f) resolve(f);
				else reject(new Error('No file selected'));
			};
			input.oncancel = () => reject(new Error('Cancelled'));
			document.body.appendChild(input);
			input.click();
			document.body.removeChild(input);
		});
	}

	const zip = await JSZip.loadAsync(file);
	const boardJson = await zip.file('board.json')?.async('string');
	if (!boardJson) throw new Error('Invalid .kork archive: missing board.json');

	const cluster = JSON.parse(boardJson) as Cluster;
	cluster.id = crypto.randomUUID();
	cluster.createdAt = new Date().toISOString();

	return cluster;
}
