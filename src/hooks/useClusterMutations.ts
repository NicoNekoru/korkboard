import { useToast } from '@/hooks/use-toast';
import type { Block, Cluster, ClusterEdge } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useCallback } from 'react';

export function useClusterMutations(
	user: User | null,
	setClusters: React.Dispatch<React.SetStateAction<Cluster[]>>,
	setEdges: React.Dispatch<React.SetStateAction<ClusterEdge[]>>,
	localMode = true,
) {
	const { toast } = useToast();

	const addCluster = useCallback(
		async (cluster: Omit<Cluster, 'blocks'> & { blocks?: Block[] }) => {
			const newCluster = { ...cluster, blocks: cluster.blocks || [] };
			setClusters((prev) => [newCluster, ...prev]);
		},
		[setClusters],
	);

	const updateCluster = useCallback(
		async (id: string, updates: Partial<Cluster>) => {
			setClusters((prev) =>
				prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
			);
		},
		[setClusters],
	);

	const deleteCluster = useCallback(
		async (id: string) => {
			setClusters((prev) => prev.filter((c) => c.id !== id));
			setEdges((prev) =>
				prev.filter((e) => e.sourceId !== id && e.targetId !== id),
			);
		},
		[setClusters, setEdges],
	);

	return { addCluster, updateCluster, deleteCluster };
}
