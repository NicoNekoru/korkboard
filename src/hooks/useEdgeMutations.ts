import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
	NO_AUTH_MODE,
	getNoAuthState,
	saveNoAuthState,
} from '@/lib/noauth-data';
import type { ClusterEdge } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';

export function useEdgeMutations(
	user: User | null,
	edges: ClusterEdge[],
	setEdges: React.Dispatch<React.SetStateAction<ClusterEdge[]>>,
	noAuthMode: boolean = NO_AUTH_MODE,
) {
	const { toast } = useToast();
	// Use ref to avoid stale closure on edges
	const edgesRef = useRef(edges);
	useEffect(() => {
		edgesRef.current = edges;
	}, [edges]);

	const addEdge = useCallback(
		async (edge: ClusterEdge) => {
			if (!user && !noAuthMode) return;
			const exists = edgesRef.current.some(
				(e) => e.sourceId === edge.sourceId && e.targetId === edge.targetId,
			);
			if (exists) return;

			setEdges((prev) => [...prev, edge]);

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: state.clusters,
					edges: [...state.edges, edge],
				});
				return;
			}

			const { error } = await supabase.from('cluster_edges').insert({
				id: edge.id,
				source_id: edge.sourceId,
				target_id: edge.targetId,
				user_id: user.id,
			});
			if (error) {
				setEdges((prev) => prev.filter((e) => e.id !== edge.id));
				toast({
					title: 'Failed to link',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[user, noAuthMode, toast, setEdges],
	);

	const removeEdge = useCallback(
		async (edgeId: string) => {
			let removed: ClusterEdge | undefined;
			setEdges((prev) => {
				removed = prev.find((e) => e.id === edgeId);
				return prev.filter((e) => e.id !== edgeId);
			});

			if (noAuthMode) {
				const state = getNoAuthState();
				saveNoAuthState({
					clusters: state.clusters,
					edges: state.edges.filter((edge) => edge.id !== edgeId),
				});
				return;
			}

			const { error } = await supabase
				.from('cluster_edges')
				.delete()
				.eq('id', edgeId);
			if (error) {
				if (removed) setEdges((prev) => [...prev, removed]);
				toast({
					title: 'Failed to unlink',
					description: error.message,
					variant: 'destructive',
				});
			}
		},
		[noAuthMode, toast, setEdges],
	);

	return { addEdge, removeEdge };
}
