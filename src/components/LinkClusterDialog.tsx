import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useClusters } from '@/context/ClusterContext';
import { cn } from '@/lib/utils';
import { Check, Link2, Search } from 'lucide-react';
import { useState } from 'react';

export function LinkClusterDialog({ clusterId }: { clusterId: string }) {
	const [open, setOpen] = useState(false);
	const [linkDirection, setLinkDirection] = useState<'child' | 'parent'>(
		'child',
	);
	const [searchQuery, setSearchQuery] = useState('');
	const {
		clusters,
		edges,
		addEdge,
		removeEdge,
		getChildClusters,
		getParentClusters,
	} = useClusters();

	const currentChildIds = new Set(
		getChildClusters(clusterId).map((cluster) => cluster.id),
	);
	const currentParentIds = new Set(
		getParentClusters(clusterId).map((cluster) => cluster.id),
	);

	const availableClusters = clusters.filter(
		(cluster) => cluster.id !== clusterId,
	);

	const filteredClusters = availableClusters.filter((cluster) => {
		if (!searchQuery.trim()) return true;
		const lowerQuery = searchQuery.trim().toLowerCase();
		const isTagQuery = lowerQuery.startsWith('#');
		const effectiveQuery = isTagQuery ? lowerQuery.slice(1) : lowerQuery;

		if (isTagQuery) {
			return cluster.tags?.some((tag) =>
				tag.toLowerCase().includes(effectiveQuery),
			);
		}

		return (
			cluster.title.toLowerCase().includes(lowerQuery) ||
			cluster.description?.toLowerCase().includes(lowerQuery) ||
			cluster.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
		);
	});

	const toggleLink = async (targetId: string) => {
		const source = linkDirection === 'child' ? clusterId : targetId;
		const target = linkDirection === 'child' ? targetId : clusterId;
		const existingEdge = edges.find(
			(edge) => edge.sourceId === source && edge.targetId === target,
		);

		if (existingEdge) {
			await removeEdge(existingEdge.id);
			return;
		}

		await addEdge({
			id: crypto.randomUUID(),
			sourceId: source,
			targetId: target,
		});
	};

	return (
		<>
			<Button
				variant='outline'
				size='sm'
				className='gap-1.5 font-display'
				onClick={() => {
					setLinkDirection('child');
					setSearchQuery('');
					setOpen(true);
				}}
			>
				<Link2 className='h-4 w-4' />
				Link
			</Button>

			<Modal
				open={open}
				onOpenChange={setOpen}
				className='max-w-md'
				title='Link clusters'
				description={
					linkDirection === 'child'
						? 'Select clusters to nest within this one.'
						: 'Select clusters to nest this one under.'
				}
			>
				<div className='flex bg-secondary p-1 rounded-md mb-4 mt-2'>
					<button
						type='button'
						className={cn(
							'flex-1 text-sm py-1.5 rounded-sm transition-colors',
							linkDirection === 'child'
								? 'bg-background shadow-sm text-foreground'
								: 'text-muted-foreground hover:text-foreground',
						)}
						onClick={() => setLinkDirection('child')}
					>
						Add as Child
					</button>
					<button
						type='button'
						className={cn(
							'flex-1 text-sm py-1.5 rounded-sm transition-colors',
							linkDirection === 'parent'
								? 'bg-background shadow-sm text-foreground'
								: 'text-muted-foreground hover:text-foreground',
						)}
						onClick={() => setLinkDirection('parent')}
					>
						Add as Parent
					</button>
				</div>

				<div className='relative mb-4'>
					<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Search clusters...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='pl-9'
					/>
				</div>

				<div className='max-h-64 space-y-1 overflow-y-auto'>
					{filteredClusters.map((cluster) => {
						const isLinked =
							linkDirection === 'child'
								? currentChildIds.has(cluster.id)
								: currentParentIds.has(cluster.id);
						return (
							<button
								key={cluster.id}
								type='button'
								onClick={() => void toggleLink(cluster.id)}
								className={cn(
									'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
									isLinked
										? 'border-accent bg-accent/10'
										: 'border-border hover:border-accent/50',
								)}
							>
								<div>
									<p className='font-display text-sm font-medium'>
										{cluster.title}
									</p>
									<p className='text-xs text-muted-foreground'>
										{cluster.blocks.length} blocks
									</p>
								</div>
								{isLinked ? <Check className='h-4 w-4 text-accent' /> : null}
							</button>
						);
					})}
					{availableClusters.length === 0 ? (
						<p className='text-center text-sm text-muted-foreground p-4'>
							No other clusters available.
						</p>
					) : filteredClusters.length === 0 ? (
						<p className='text-center text-sm text-muted-foreground p-4'>
							No clusters match your search.
						</p>
					) : null}
				</div>
			</Modal>
		</>
	);
}
