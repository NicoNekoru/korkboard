import { ClusterCard } from '@/components/ClusterCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useClusters } from '@/context/ClusterContext';
import { isTauri } from '@/lib/db';
import type { Cluster } from '@/lib/types';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { GitGraph, Layers, LogOut, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MAX_TITLE_LENGTH = 100;
const MAX_DESC_LENGTH = 500;

const Index = () => {
	const { clusters, addCluster } = useClusters();
	const { signOut, user } = useAuth();
	const navigate = useNavigate();
	const [newTitle, setNewTitle] = useState('');
	const [newDesc, setNewDesc] = useState('');
	const [openModal, setOpenModal] = useState(false);

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
		setOpenModal(false);
	};

	const handleImport = async () => {
		if (!isTauri()) return;
		try {
			const selected = await open({
				filters: [{ name: 'Korkboard Archive', extensions: ['kork'] }],
			});
			if (selected && typeof selected === 'string') {
				const boardJson = await invoke<string>('import_board', {
					archivePath: selected,
				});
				const cluster = JSON.parse(boardJson) as Cluster;
				// Ensure IDs are unique if importing multiple times
				cluster.id = crypto.randomUUID();
				cluster.createdAt = new Date().toISOString();
				void addCluster(cluster);
			}
		} catch (error) {
			console.error('Import failed', error);
		}
	};

	return (
		<div className='min-h-screen'>
			<section className='container flex items-center justify-between pb-4 pt-6'>
				<h1 className='font-display text-2xl font-bold'>Korkboard</h1>
				<div className='flex gap-2'>
					<Button variant='ghost' size='sm' onClick={() => navigate('/graph')}>
						<GitGraph className='mr-2 h-4 w-4' />
						Global Graph
					</Button>
					{isTauri() && (
						<Button variant='ghost' size='sm' onClick={handleImport}>
							<Upload className='mr-2 h-4 w-4' />
							Import
						</Button>
					)}
					{user ? (
						<Button variant='ghost' size='sm' onClick={() => void signOut()}>
							<LogOut className='mr-2 h-4 w-4' />
							Sign out
						</Button>
					) : (
						<Button variant='ghost' size='sm' onClick={() => navigate('/auth')}>
							<LogOut className='mr-2 h-4 w-4' />
							Sign in
						</Button>
					)}
				</div>
			</section>

			<section className='container pb-20 pt-4'>
				<div className='mb-8 flex items-center justify-between'>
					<h2 className='font-display text-xl font-semibold'>All Clusters</h2>
					<Button
						variant='outline'
						size='sm'
						className='gap-1.5 font-display'
						onClick={() => setOpenModal(true)}
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
						<Button onClick={() => setOpenModal(true)} className='gap-1.5'>
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
				open={openModal}
				onOpenChange={setOpenModal}
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
