import { sampleClusters, sampleEdges } from '@/lib/sample-data';
import type { Cluster, ClusterEdge } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export const NO_AUTH_MODE = import.meta.env.VITE_NO_AUTH === 'true';
export const NO_AUTH_STORAGE_KEY = 'korkboard:noauth-state';

export const NO_AUTH_USER = {
	id: 'dev-noauth-user',
	aud: 'authenticated',
	role: 'authenticated',
	email: 'dev@localhost',
	app_metadata: {},
	user_metadata: {},
	created_at: new Date().toISOString(),
} as User;

export interface NoAuthState {
	clusters: Cluster[];
	edges: ClusterEdge[];
}

function cloneClusters(clusters: Cluster[]) {
	return clusters.map((cluster) => ({
		...cluster,
		blocks: cluster.blocks.map((block) => ({ ...block })),
	}));
}

function cloneEdges(edges: ClusterEdge[]) {
	return edges.map((edge) => ({ ...edge }));
}

function cloneSampleState(): NoAuthState {
	return {
		clusters: cloneClusters(sampleClusters),
		edges: cloneEdges(sampleEdges),
	};
}

export function getNoAuthState(): NoAuthState {
	if (typeof window === 'undefined') {
		return cloneSampleState();
	}

	try {
		const raw = window.localStorage.getItem(NO_AUTH_STORAGE_KEY);
		if (!raw) {
			const initial = cloneSampleState();
			window.localStorage.setItem(NO_AUTH_STORAGE_KEY, JSON.stringify(initial));
			return initial;
		}

		const parsed = JSON.parse(raw) as NoAuthState;
		return {
			clusters: parsed.clusters ?? [],
			edges: parsed.edges ?? [],
		};
	} catch {
		const fallback = cloneSampleState();
		window.localStorage.setItem(NO_AUTH_STORAGE_KEY, JSON.stringify(fallback));
		return fallback;
	}
}

export function saveNoAuthState(state: NoAuthState) {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(NO_AUTH_STORAGE_KEY, JSON.stringify(state));
}
