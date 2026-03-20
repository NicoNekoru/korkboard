import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
	NO_AUTH_MODE,
	getNoAuthState,
	saveNoAuthState,
} from '@/lib/noauth-data';
import type { Block, Cluster } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useCallback } from 'react';

export function useClusterMutations(
	user: User | null,
	setClusters: React.Dispatch<React.SetStateAction<Cluster[]>>,
	setEdges: React.Dispatch<
		React.SetStateAction<import('@/lib/types').ClusterEdge[]>
	>,
	noAuthMode: boolean = NO_AUTH_MODE,
) {
	const { toast } = useToast();

	const addCluster = useCallback(
		async (cluster: Omit<Cluster, 'blocks'> & { blocks?: Block[] }) => {
			if (!user && !noAuthMode) return;
			const newCluster = { ...cluster, blocks: cluster.blocks || [] };
			setClusters((prev) => [newCluster, ...prev]);

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: [newCluster, ...state.clusters],
					edges: state.edges,
				});
				return;
			}

			const { error } = await supabase.from('clusters').insert({
				id: cluster.id,
				title: cluster.title,
				description: cluster.description ?? null,
				user_id: user.id,
			});
			if (error) {
				setClusters((prev) => prev.filter((c) => c.id !== cluster.id));
				toast({
					title: 'Failed to create cluster',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[user, noAuthMode, toast, setClusters],
	);

	const updateCluster = useCallback(
		async (id: string, updates: Partial<Cluster>) => {
			setClusters((prev) => {
				const snapshot = prev;
				const updated = prev.map((c) =>
					c.id === id ? { ...c, ...updates } : c,
				);

				if (noAuthMode) {
					saveNoAuthState({
						...getNoAuthState(),
						clusters: updated,
					});
					return updated;
				}

				supabase
					.from('clusters')
					.update({
						title: updates.title,
						description: updates.description ?? null,
					})
					.eq('id', id)
					.then(({ error }) => {
						if (error) {
							setClusters(snapshot);
							toast({
								title: 'Failed to update',
								description: error.message,
								variant: 'destructive',
							});
						}
					});
				return updated;
			});
		},
		[noAuthMode, toast, setClusters],
	);

	const deleteCluster = useCallback(
		async (id: string) => {
			let snapshotClusters: Cluster[] = [];
			let snapshotEdges: import('@/lib/types').ClusterEdge[] = [];
			setClusters((prev) => {
				snapshotClusters = prev;
				return prev.filter((c) => c.id !== id);
			});
			setEdges((prev) => {
				snapshotEdges = prev;
				return prev.filter((e) => e.sourceId !== id && e.targetId !== id);
			});

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: state.clusters.filter((cluster) => cluster.id !== id),
					edges: state.edges.filter(
						(edge) => edge.sourceId !== id && edge.targetId !== id,
					),
				});
				return;
			}

			const { error } = await supabase.from('clusters').delete().eq('id', id);
			if (error) {
				setClusters(snapshotClusters);
				setEdges(snapshotEdges);
				toast({
					title: 'Failed to delete',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[noAuthMode, toast, setClusters, setEdges],
	);

	return { addCluster, updateCluster, deleteCluster };
}
