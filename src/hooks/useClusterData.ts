import { useToast } from '@/hooks/use-toast';
import { loadClusters, saveClusterData } from '@/lib/db';
import type { Cluster, ClusterEdge } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';

export function useClusterData(user: User | null, localMode = true) {
	const { toast } = useToast();
	const [clusters, setClusters] = useState<Cluster[]>([]);
	const [edges, setEdges] = useState<ClusterEdge[]>([]);
	const [loading, setLoading] = useState(true);

	const isFirstLoad = useRef(true);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				const data = await loadClusters();
				setClusters(data.clusters);
				setEdges(data.edges);
			} catch (error) {
				toast({ title: 'Error loading data', variant: 'destructive' });
				console.error(error);
			} finally {
				setLoading(false);
				isFirstLoad.current = false;
			}
		};

		fetchData();
	}, [toast]);

	// Save whenever data changes
	useEffect(() => {
		if (!isFirstLoad.current && localMode) {
			saveClusterData(clusters, edges).catch((err) => {
				console.error('Failed to save to local DB:', err);
			});
		}
	}, [clusters, edges, localMode]);

	return { clusters, setClusters, edges, setEdges, loading };
}
