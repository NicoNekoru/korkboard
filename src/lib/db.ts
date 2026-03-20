import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { sampleClusters, sampleEdges } from './sample-data';
import type { Block, Cluster, ClusterEdge } from './types';

// Helper to determine if we are running in Tauri
export const isTauri = () => {
	// @ts-ignore
	return window.__TAURI_INTERNALS__ !== undefined;
};

export const getAssetUrl = (localPath: string) => {
	if (!localPath || typeof localPath !== 'string') return '';
	if (
		localPath.startsWith('http') ||
		localPath.startsWith('blob') ||
		localPath.startsWith('data:')
	) {
		return localPath;
	}
	try {
		return convertFileSrc(localPath);
	} catch (e) {
		return localPath;
	}
};

export async function cacheAsset(url: string): Promise<string> {
	if (!isTauri() || !url || !url.startsWith('http')) return url;
	try {
		const localPath = await invoke<string>('download_asset', { url });
		return localPath;
	} catch (e) {
		console.error('Failed to cache asset', e);
		return url;
	}
}

// Singleton DB instance
let dbInstance: Database | null = null;

// IndexedDB / LocalStorage fallback for Web mode
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

// Ensure DB is loaded
export async function getDb(): Promise<Database> {
	if (dbInstance) return dbInstance;

	dbInstance = await Database.load('sqlite:korkboard.db');

	// Initialize tables
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

	const dbClusters = await db.select<any[]>(
		'SELECT * FROM clusters ORDER BY created_at DESC',
	);
	const dbBlocks = await db.select<any[]>(
		'SELECT * FROM blocks ORDER BY created_at DESC',
	);
	const dbEdges = await db.select<any[]>('SELECT * FROM cluster_edges');

	const blocksByCluster = new Map<string, Block[]>();
	for (const b of dbBlocks) {
		const blocks = blocksByCluster.get(b.cluster_id) || [];
		blocks.push({
			id: b.id,
			type: b.type,
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

	// Full sync for simplicity (for now)
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
