import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
	NO_AUTH_MODE,
	getNoAuthState,
	saveNoAuthState,
} from '@/lib/noauth-data';
import type { Block, Cluster, ClusterEdge } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

function mapBlockRow(b: any): Block {
	return {
		id: b.id,
		type: b.type as Block['type'],
		title: b.title,
		description: b.description ?? undefined,
		url: b.url ?? undefined,
		imageUrl: b.image_url ?? undefined,
		author: b.author ?? undefined,
		content: b.content ?? undefined,
		tags: b.tags ?? [],
		note: b.note ?? undefined,
		colorLabel: b.color_label ?? undefined,
		createdAt: b.created_at,
		updatedAt: b.updated_at,
	};
}

export function useClusterData(user: User | null, noAuthMode = NO_AUTH_MODE) {
	const { toast } = useToast();
	const [clusters, setClusters] = useState<Cluster[]>([]);
	const [edges, setEdges] = useState<ClusterEdge[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (noAuthMode) {
			const state = getNoAuthState();
			setClusters(state.clusters);
			setEdges(state.edges);
			setLoading(false);
			return;
		}

		if (!user) {
			setClusters([]);
			setEdges([]);
			setLoading(false);
			return;
		}

		const fetchData = async () => {
			setLoading(true);

			const [clustersRes, blocksRes, edgesRes] = await Promise.all([
				supabase
					.from('clusters')
					.select('*')
					.order('created_at', { ascending: false }),
				supabase
					.from('blocks')
					.select('*')
					.order('created_at', { ascending: false }),
				supabase.from('cluster_edges').select('*'),
			]);

			if (clustersRes.error || blocksRes.error || edgesRes.error) {
				toast({ title: 'Error loading data', variant: 'destructive' });
				setLoading(false);
				return;
			}

			const blocksByCluster = new Map<string, Block[]>();
			for (const b of blocksRes.data) {
				const blocks = blocksByCluster.get(b.cluster_id) || [];
				blocks.push(mapBlockRow(b));
				blocksByCluster.set(b.cluster_id, blocks);
			}

			const nextClusters = clustersRes.data.map((c) => ({
				id: c.id,
				title: c.title,
				description: c.description ?? undefined,
				blocks: blocksByCluster.get(c.id) || [],
				createdAt: c.created_at,
			}));

			const nextEdges = edgesRes.data.map((e) => ({
				id: e.id,
				sourceId: e.source_id,
				targetId: e.target_id,
			}));

			setClusters(nextClusters);
			setEdges(nextEdges);

			setLoading(false);
		};

		fetchData();
	}, [noAuthMode, user, toast]);

	useEffect(() => {
		if (noAuthMode) {
			saveNoAuthState({ clusters, edges });
		}
	}, [clusters, edges, noAuthMode]);

	return { clusters, setClusters, edges, setEdges, loading };
}
