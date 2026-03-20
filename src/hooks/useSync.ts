import { supabase } from '@/integrations/supabase/client';
import type { Cluster, ClusterEdge } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useCallback } from 'react';

export function useSync(user: User | null) {
	const sync = useCallback(
		async (clusters: Cluster[], edges: ClusterEdge[]) => {
			if (!user) return;

			console.log('Syncing with Supabase...');

			try {
				// 1. Sync Clusters
				const clusterRows = clusters.map((c) => ({
					id: c.id,
					title: c.title,
					description: c.description ?? null,
					user_id: user.id,
					created_at: c.createdAt,
				}));

				await supabase.from('clusters').upsert(clusterRows);

				// 2. Sync Blocks
				const blockRows = clusters.flatMap((c) =>
					c.blocks.map((b) => ({
						id: b.id,
						cluster_id: c.id,
						user_id: user.id,
						type: b.type,
						title: b.title,
						description: b.description ?? null,
						url: b.url ?? null,
						image_url: b.imageUrl ?? null,
						author: b.author ?? null,
						content: b.content ?? null,
						tags: b.tags,
						note: b.note ?? null,
						color_label: b.colorLabel ?? null,
						created_at: b.createdAt,
						updated_at: b.updatedAt ?? null,
					})),
				);

				if (blockRows.length > 0) {
					await supabase.from('blocks').upsert(blockRows);
				}

				// 3. Sync Edges
				const edgeRows = edges.map((e) => ({
					id: e.id,
					source_id: e.sourceId,
					target_id: e.targetId,
					user_id: user.id,
				}));

				if (edgeRows.length > 0) {
					await supabase.from('cluster_edges').upsert(edgeRows);
				}

				console.log('Sync complete!');
			} catch (error) {
				console.error('Sync failed', error);
			}
		},
		[user],
	);

	return { sync };
}
