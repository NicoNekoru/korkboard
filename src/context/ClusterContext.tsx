import { useAuth } from '@/context/AuthContext';
import { useBlockMutations } from '@/hooks/useBlockMutations';
import { useClusterData } from '@/hooks/useClusterData';
import { useClusterGraph } from '@/hooks/useClusterGraph';
import { useClusterMutations } from '@/hooks/useClusterMutations';
import { useEdgeMutations } from '@/hooks/useEdgeMutations';
import { useSync } from '@/hooks/useSync';
import type { Block, Cluster, ClusterEdge } from '@/lib/types';
import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useRef,
} from 'react';

interface ClusterContextType {
	clusters: Cluster[];
	edges: ClusterEdge[];
	loading: boolean;
	addCluster: (
		cluster: Omit<Cluster, 'blocks'> & { blocks?: Block[] },
	) => Promise<void>;
	updateCluster: (id: string, updates: Partial<Cluster>) => Promise<void>;
	deleteCluster: (id: string) => Promise<void>;
	addBlockToCluster: (clusterId: string, block: Block) => Promise<void>;
	updateBlock: (blockId: string, updates: Partial<Block>) => Promise<void>;
	deleteBlock: (blockId: string) => Promise<void>;
	moveBlock: (
		blockId: string,
		fromClusterId: string,
		toClusterId: string,
	) => Promise<void>;
	addEdge: (edge: ClusterEdge) => Promise<void>;
	removeEdge: (edgeId: string) => Promise<void>;
	getChildClusters: (clusterId: string) => Cluster[];
	getParentClusters: (clusterId: string) => Cluster[];
	getRootClusters: () => Cluster[];
	getClusterById: (id: string) => Cluster | undefined;
}

const ClusterContext = createContext<ClusterContextType | undefined>(undefined);

export function ClusterProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const localMode = true;
	const { clusters, setClusters, edges, setEdges, loading } = useClusterData(
		user,
		localMode,
	);

	const { sync } = useSync(user);
	const syncTimeout = useRef<number | null>(null);

	// Sync when data changes and user is logged in
	useEffect(() => {
		if (!user || loading) return;

		if (syncTimeout.current) window.clearTimeout(syncTimeout.current);
		syncTimeout.current = window.setTimeout(() => {
			sync(clusters, edges);
		}, 5000); // 5s debounce

		return () => {
			if (syncTimeout.current) window.clearTimeout(syncTimeout.current);
		};
	}, [clusters, edges, user, loading, sync]);

	const { addCluster, updateCluster, deleteCluster } = useClusterMutations(
		user,
		setClusters,
		setEdges,
		localMode,
	);
	const { addBlockToCluster, updateBlock, deleteBlock, moveBlock } =
		useBlockMutations(user, setClusters, localMode);
	const { addEdge, removeEdge } = useEdgeMutations(
		user,
		edges,
		setEdges,
		localMode,
	);
	const {
		getChildClusters,
		getParentClusters,
		getRootClusters,
		getClusterById,
	} = useClusterGraph(clusters, edges);

	return (
		<ClusterContext.Provider
			value={{
				clusters,
				edges,
				loading,
				addCluster,
				updateCluster,
				deleteCluster,
				addBlockToCluster,
				updateBlock,
				deleteBlock,
				moveBlock,
				addEdge,
				removeEdge,
				getChildClusters,
				getParentClusters,
				getRootClusters,
				getClusterById,
			}}
		>
			{children}
		</ClusterContext.Provider>
	);
}

export function useClusters() {
	const context = useContext(ClusterContext);
	if (!context)
		throw new Error('useClusters must be used within a ClusterProvider');
	return context;
}
