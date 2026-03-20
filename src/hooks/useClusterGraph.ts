import type { Cluster, ClusterEdge } from '@/lib/types';
import { useCallback } from 'react';

// Pure graph traversal functions (exported for testing)
export function getChildClusterIds(
	edges: ClusterEdge[],
	clusterId: string,
): string[] {
	return edges.filter((e) => e.sourceId === clusterId).map((e) => e.targetId);
}

export function getParentClusterIds(
	edges: ClusterEdge[],
	clusterId: string,
): string[] {
	return edges.filter((e) => e.targetId === clusterId).map((e) => e.sourceId);
}

export function getRootClusterIds(
	edges: ClusterEdge[],
	clusterIds: string[],
): string[] {
	const childIds = new Set(edges.map((e) => e.targetId));
	return clusterIds.filter((id) => !childIds.has(id));
}

export function useClusterGraph(clusters: Cluster[], edges: ClusterEdge[]) {
	const getChildClusters = useCallback(
		(clusterId: string) => {
			const childIds = getChildClusterIds(edges, clusterId);
			return clusters.filter((c) => childIds.includes(c.id));
		},
		[clusters, edges],
	);

	const getParentClusters = useCallback(
		(clusterId: string) => {
			const parentIds = getParentClusterIds(edges, clusterId);
			return clusters.filter((c) => parentIds.includes(c.id));
		},
		[clusters, edges],
	);

	const getRootClusters = useCallback(() => {
		const childIds = new Set(edges.map((e) => e.targetId));
		return clusters.filter((c) => !childIds.has(c.id));
	}, [clusters, edges]);

	const getClusterById = useCallback(
		(id: string) => clusters.find((c) => c.id === id),
		[clusters],
	);

	return {
		getChildClusters,
		getParentClusters,
		getRootClusters,
		getClusterById,
	};
}
