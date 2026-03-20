import { ClusterCard } from '@/components/ClusterCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { useClusters } from '@/context/ClusterContext';
import type { Cluster } from '@/lib/types';
import { Layers, Plus } from 'lucide-react';
import { useState } from 'react';

const MAX_TITLE_LENGTH = 100;
const MAX_DESC_LENGTH = 500;

const Index = () => {
	const { clusters, addCluster } = useClusters();
	const [newTitle, setNewTitle] = useState('');
	const [newDesc, setNewDesc] = useState('');
	const [open, setOpen] = useState(false);

	const handleCreateCluster = () => {
		const trimmedTitle = newTitle.trim();
		if (!trimmedTitle) {
			return;
		}

		const cluster: Cluster = {
			id: crypto.randomUUID(),
			title: trimmedTitle.slice(0, MAX_TITLE_LENGTH),
			description: newDesc.trim().slice(0, MAX_DESC_LENGTH) || undefined,
			blocks: [],
			createdAt: new Date().toISOString(),
		};

		void addCluster(cluster);
		setNewTitle('');
		setNewDesc('');
		setOpen(false);
	};

	return (
		<div className='min-h-screen'>
			<section className='container pb-4 pt-4'>
			</section>

			<section className='container pb-20'>
				<div className='mb-8 flex items-center justify-between'>
					<h2 className='font-display text-xl font-semibold'>All Clusters</h2>
					<Button
						variant='outline'
						size='sm'
						className='gap-1.5 font-display'
						onClick={() => setOpen(true)}
					>
						<Plus className='h-4 w-4' />
						New Cluster
					</Button>
				</div>

				{clusters.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-24 text-center'>
						<div className='mb-6 rounded-full bg-muted p-6'>
							<Layers className='h-10 w-10 text-muted-foreground' />
						</div>
						<h3 className='mb-2 font-display text-xl font-semibold'>
							No clusters yet
						</h3>
						<p className='mb-6 max-w-sm text-muted-foreground'>
							Create your first cluster to start organizing your ideas, links,
							and notes.
						</p>
						<Button onClick={() => setOpen(true)} className='gap-1.5'>
							<Plus className='h-4 w-4' />
							Create your first cluster
						</Button>
					</div>
				) : (
					<div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
						{clusters.map((cluster, index) => (
							<ClusterCard key={cluster.id} cluster={cluster} index={index} />
						))}
					</div>
				)}
			</section>

			<Modal
				open={open}
				onOpenChange={setOpen}
				className='max-w-md'
				title='Create a cluster'
			>
				<div className='space-y-3 pt-2'>
					<Input
						placeholder='Cluster title'
						value={newTitle}
						onChange={(event) => setNewTitle(event.target.value)}
						className='font-display'
						maxLength={MAX_TITLE_LENGTH}
					/>
					<Textarea
						placeholder='Description (optional)'
						value={newDesc}
						onChange={(event) => setNewDesc(event.target.value)}
						rows={2}
						maxLength={MAX_DESC_LENGTH}
					/>
					<div className='flex justify-end'>
						<Button
							size='sm'
							onClick={handleCreateCluster}
							disabled={!newTitle.trim()}
						>
							Create
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default Index;
