import { useToast } from '@/hooks/use-toast';
import { cacheAsset } from '@/lib/db';
import type { Block, Cluster } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useCallback } from 'react';

export function useBlockMutations(
	user: User | null,
	setClusters: React.Dispatch<React.SetStateAction<Cluster[]>>,
	localMode = true,
) {
	const { toast } = useToast();

	const addBlockToCluster = useCallback(
		async (clusterId: string, block: Block) => {
			const finalBlock = { ...block };
			if (block.imageUrl && localMode) {
				const localPath = await cacheAsset(block.imageUrl);
				finalBlock.imageUrl = localPath;
			}
			setClusters((prev) =>
				prev.map((c) =>
					c.id === clusterId ? { ...c, blocks: [finalBlock, ...c.blocks] } : c,
				),
			);
		},
		[setClusters, localMode],
	);

	const updateBlock = useCallback(
		async (blockId: string, updates: Partial<Block>) => {
			const finalUpdates = { ...updates };
			if (updates.imageUrl && localMode) {
				const localPath = await cacheAsset(updates.imageUrl);
				finalUpdates.imageUrl = localPath;
			}
			setClusters((prev) =>
				prev.map((c) => ({
					...c,
					blocks: c.blocks.map((b) =>
						b.id === blockId ? { ...b, ...finalUpdates } : b,
					),
				})),
			);
		},
		[setClusters, localMode],
	);

	const deleteBlock = useCallback(
		async (blockId: string) => {
			setClusters((prev) =>
				prev.map((c) => ({
					...c,
					blocks: c.blocks.filter((b) => b.id !== blockId),
				})),
			);
		},
		[setClusters],
	);

	const moveBlock = useCallback(
		async (blockId: string, fromClusterId: string, toClusterId: string) => {
			setClusters((prev) => {
				const fromCluster = prev.find((c) => c.id === fromClusterId);
				const movedBlock = fromCluster?.blocks.find((b) => b.id === blockId);
				if (!movedBlock) return prev;

				return prev.map((c) => {
					if (c.id === fromClusterId)
						return { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) };
					if (c.id === toClusterId)
						return { ...c, blocks: [movedBlock, ...c.blocks] };
					return c;
				});
			});
		},
		[setClusters],
	);

	return { addBlockToCluster, updateBlock, deleteBlock, moveBlock };
}
