import { useToast } from '@/hooks/use-toast';
import type { ClusterEdge } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { useCallback } from 'react';

export function useEdgeMutations(
	user: User | null,
	edges: ClusterEdge[],
	setEdges: React.Dispatch<React.SetStateAction<ClusterEdge[]>>,
	localMode = true,
) {
	const { toast } = useToast();

	const addEdge = useCallback(
		async (edge: ClusterEdge) => {
			const exists = edges.some(
				(e) =>
					(e.sourceId === edge.sourceId && e.targetId === edge.targetId) ||
					(e.sourceId === edge.targetId && e.targetId === edge.sourceId),
			);
			if (exists) return;

			setEdges((prev) => [...prev, edge]);
		},
		[edges, setEdges],
	);

	const removeEdge = useCallback(
		async (edgeId: string) => {
			setEdges((prev) => prev.filter((e) => e.id !== edgeId));
		},
		[setEdges],
	);

	return { addEdge, removeEdge };
}
