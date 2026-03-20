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

export function useBlockMutations(
	user: User | null,
	setClusters: React.Dispatch<React.SetStateAction<Cluster[]>>,
	noAuthMode: boolean = NO_AUTH_MODE,
) {
	const { toast } = useToast();

	const addBlockToCluster = useCallback(
		async (clusterId: string, block: Block) => {
			if (!user && !noAuthMode) return;
			setClusters((prev) =>
				prev.map((c) =>
					c.id === clusterId ? { ...c, blocks: [block, ...c.blocks] } : c,
				),
			);

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: state.clusters.map((cluster) =>
						cluster.id === clusterId
							? { ...cluster, blocks: [block, ...cluster.blocks] }
							: cluster,
					),
					edges: state.edges,
				});
				return;
			}

			const { error } = await supabase.from('blocks').insert({
				id: block.id,
				cluster_id: clusterId,
				user_id: user.id,
				type: block.type,
				title: block.title,
				description: block.description ?? null,
				url: block.url ?? null,
				image_url: block.imageUrl ?? null,
				author: block.author ?? null,
				content: block.content ?? null,
			});
			if (error) {
				setClusters((prev) =>
					prev.map((c) =>
						c.id === clusterId
							? { ...c, blocks: c.blocks.filter((b) => b.id !== block.id) }
							: c,
					),
				);
				toast({
					title: 'Failed to add block',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[user, noAuthMode, toast, setClusters],
	);

	const updateBlock = useCallback(
		async (blockId: string, updates: Partial<Block>) => {
			let snapshot: Cluster[] = [];
			setClusters((prev) => {
				snapshot = prev;
				return prev.map((c) => ({
					...c,
					blocks: c.blocks.map((b) =>
						b.id === blockId ? { ...b, ...updates } : b,
					),
				}));
			});

			const dbUpdates: Record<string, unknown> = {};
			if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
			if (updates.note !== undefined) dbUpdates.note = updates.note;
			if (updates.colorLabel !== undefined)
				dbUpdates.color_label = updates.colorLabel;
			if (updates.title !== undefined) dbUpdates.title = updates.title;
			if (updates.description !== undefined)
				dbUpdates.description = updates.description ?? null;
			if (updates.content !== undefined)
				dbUpdates.content = updates.content ?? null;
			if (updates.author !== undefined)
				dbUpdates.author = updates.author ?? null;
			if (updates.url !== undefined) dbUpdates.url = updates.url ?? null;
			if (updates.imageUrl !== undefined)
				dbUpdates.image_url = updates.imageUrl ?? null;

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: state.clusters.map((cluster) => ({
						...cluster,
						blocks: cluster.blocks.map((block) =>
							block.id === blockId ? { ...block, ...updates } : block,
						),
					})),
					edges: state.edges,
				});
				return;
			}

			const { error } = await supabase
				.from('blocks')
				.update(dbUpdates)
				.eq('id', blockId);
			if (error) {
				setClusters(snapshot);
				toast({
					title: 'Failed to update block',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[noAuthMode, toast, setClusters],
	);

	const deleteBlock = useCallback(
		async (blockId: string) => {
			let snapshot: Cluster[] = [];
			setClusters((prev) => {
				snapshot = prev;
				return prev.map((c) => ({
					...c,
					blocks: c.blocks.filter((b) => b.id !== blockId),
				}));
			});

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: state.clusters.map((cluster) => ({
						...cluster,
						blocks: cluster.blocks.filter((block) => block.id !== blockId),
					})),
					edges: state.edges,
				});
				return;
			}

			const { error } = await supabase
				.from('blocks')
				.delete()
				.eq('id', blockId);
			if (error) {
				setClusters(snapshot);
				toast({
					title: 'Failed to delete block',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[noAuthMode, toast, setClusters],
	);

	const moveBlock = useCallback(
		async (blockId: string, fromClusterId: string, toClusterId: string) => {
			if (!user && !noAuthMode) return;
			let movedBlock: Block | undefined;
			let snapshot: Cluster[] = [];
			setClusters((prev) => {
				snapshot = prev;
				const fromCluster = prev.find((c) => c.id === fromClusterId);
				movedBlock = fromCluster?.blocks.find((b) => b.id === blockId);
				if (!movedBlock) return prev;
				return prev.map((c) => {
					if (c.id === fromClusterId)
						return { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) };
					if (c.id === toClusterId && movedBlock)
						return { ...c, blocks: [movedBlock, ...c.blocks] };
					return c;
				});
			});

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: state.clusters.map((cluster) => {
						if (cluster.id === fromClusterId) {
							return {
								...cluster,
								blocks: cluster.blocks.filter((block) => block.id !== blockId),
							};
						}

						if (cluster.id === toClusterId && movedBlock) {
							return {
								...cluster,
								blocks: [movedBlock, ...cluster.blocks],
							};
						}

						return cluster;
					}),
					edges: state.edges,
				});
				return;
			}

			const { error } = await supabase
				.from('blocks')
				.update({ cluster_id: toClusterId })
				.eq('id', blockId);
			if (error) {
				setClusters(snapshot);
				toast({
					title: 'Failed to move block',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[user, noAuthMode, toast, setClusters],
	);

	return { addBlockToCluster, updateBlock, deleteBlock, moveBlock };
}
