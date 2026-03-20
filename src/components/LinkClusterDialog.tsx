import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useClusters } from '@/context/ClusterContext';
import { cn } from '@/lib/utils';
import { Check, Link2 } from 'lucide-react';
import { useState } from 'react';

export function LinkClusterDialog({ clusterId }: { clusterId: string }) {
	const [open, setOpen] = useState(false);
	const { clusters, edges, addEdge, removeEdge, getChildClusters } =
		useClusters();

	const currentChildIds = new Set(
		getChildClusters(clusterId).map((cluster) => cluster.id),
	);
	const availableClusters = clusters.filter(
		(cluster) => cluster.id !== clusterId,
	);

	const toggleLink = async (targetId: string) => {
		const existingEdge = edges.find(
			(edge) => edge.sourceId === clusterId && edge.targetId === targetId,
		);

		if (existingEdge) {
			await removeEdge(existingEdge.id);
			return;
		}

		await addEdge({
			id: crypto.randomUUID(),
			sourceId: clusterId,
			targetId,
		});
	};

	return (
		<>
			<Button
				variant='outline'
				size='sm'
				className='gap-1.5 font-display'
				onClick={() => setOpen(true)}
			>
				<Link2 className='h-4 w-4' />
				Link
			</Button>

			<Modal
				open={open}
				onOpenChange={setOpen}
				className='max-w-md'
				title='Link clusters'
				description='Select clusters to nest within this one. A cluster can belong to multiple parents.'
			>
				<div className='max-h-64 space-y-1 overflow-y-auto'>
					{availableClusters.map((cluster) => {
						const isLinked = currentChildIds.has(cluster.id);
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
				</div>
			</Modal>
		</>
	);
}
