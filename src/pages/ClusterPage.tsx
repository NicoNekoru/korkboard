import { AddBlockDialog } from '@/components/AddBlockDialog';
import { BlockCard } from '@/components/BlockCard';
import { ClusterCard } from '@/components/ClusterCard';
import { ClusterGraph } from '@/components/ClusterGraph';
import { GraphSearch } from '@/components/GraphSearch';
import { LinkClusterDialog } from '@/components/LinkClusterDialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useClusters } from '@/context/ClusterContext';
import type { Block, Cluster, ClusterEdge } from '@/lib/types';
import { ChevronRight, FolderPlus, Link2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function EditableTitle({
	value,
	onSave,
}: { value: string; onSave: (value: string) => void }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	useEffect(() => {
		if (editing) {
			inputRef.current?.focus();
		}
	}, [editing]);

	const commit = () => {
		const trimmed = draft.trim();
		if (trimmed && trimmed !== value) {
			onSave(trimmed);
		} else {
			setDraft(value);
		}
		setEditing(false);
	};

	if (editing) {
		return (
			<Input
				ref={inputRef}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						commit();
					}
					if (event.key === 'Escape') {
						setDraft(value);
						setEditing(false);
					}
				}}
				maxLength={120}
				className='h-auto border-none bg-transparent px-1 py-0 font-display text-3xl font-bold tracking-tight focus-visible:ring-1'
			/>
		);
	}

	return (
		<h1
			role='button'
			tabIndex={0}
			onClick={() => setEditing(true)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					setEditing(true);
				}
			}}
			className='-mx-1 cursor-text rounded px-1 font-display text-3xl font-bold tracking-tight transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
			title='Click to rename'
		>
			{value}
		</h1>
	);
}

function EditableDescription({
	value,
	onSave,
}: { value: string; onSave: (value: string) => void }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	useEffect(() => {
		if (editing) {
			textareaRef.current?.focus();
		}
	}, [editing]);

	const commit = () => {
		const trimmed = draft.trim();
		if (trimmed !== value) {
			onSave(trimmed);
		} else {
			setDraft(value);
		}
		setEditing(false);
	};

	if (editing) {
		return (
			<Textarea
				ref={textareaRef}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						setDraft(value);
						setEditing(false);
					}
				}}
				maxLength={500}
				placeholder='Add a description…'
				className='mt-1 max-w-lg resize-none border-none bg-transparent px-1 text-sm text-muted-foreground focus-visible:ring-1'
				rows={2}
			/>
		);
	}

	return (
		<p
			role='button'
			tabIndex={0}
			onClick={() => setEditing(true)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					setEditing(true);
				}
			}}
			className='-mx-1 mt-1 min-h-[1.5rem] max-w-lg cursor-text rounded px-1 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
			title='Click to edit description'
		>
			{value || 'Add a description…'}
		</p>
	);
}

export default function ClusterPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const {
		getClusterById,
		getChildClusters,
		getParentClusters,
		addBlockToCluster,
		addCluster,
		addEdge,
		updateCluster,
		deleteCluster,
		edges,
	} = useClusters();
	const [deleteOpen, setDeleteOpen] = useState(false);

	const cluster = getClusterById(id || '');
	const childClusters = getChildClusters(id || '');
	const parentClusters = getParentClusters(id || '');

	if (!cluster) {
		return (
			<div className='p-8 text-center'>
				<p className='text-muted-foreground'>Cluster not found.</p>
			</div>
		);
	}

	const handleNewSubCluster = async () => {
		const newCluster: Omit<Cluster, 'blocks'> = {
			id: crypto.randomUUID(),
			title: 'New Cluster',
			createdAt: new Date().toISOString(),
		};
		await addCluster(newCluster);
		const newEdge: ClusterEdge = {
			id: crypto.randomUUID(),
			sourceId: cluster.id,
			targetId: newCluster.id,
		};
		await addEdge(newEdge);
		navigate(`/cluster/${newCluster.id}`);
	};

	const handleDeleteCluster = async () => {
		await deleteCluster(cluster.id);
		navigate('/');
	};

	return (
		<div className='min-h-screen'>
			<section className='container pb-6 pt-6'>
				<div className='mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
					<button
						type='button'
						onClick={() => navigate('/')}
						className='transition-colors hover:text-foreground'
					>
						Home
					</button>
					{parentClusters.length > 0 ? (
						<>
							<ChevronRight className='h-4 w-4' />
							{parentClusters.map((parent, index) => (
								<span key={parent.id} className='flex items-center gap-2'>
									<button
										type='button'
										onClick={() => navigate(`/cluster/${parent.id}`)}
										className='transition-colors hover:text-foreground'
									>
										{parent.title}
									</button>
									{index < parentClusters.length - 1 ? <span>,</span> : null}
								</span>
							))}
						</>
					) : null}
					<ChevronRight className='h-4 w-4' />
					<span className='font-medium text-foreground'>{cluster.title}</span>
				</div>

				<div className='mb-8 flex items-start justify-between gap-4'>
					<div className='min-w-0 flex-1'>
						<EditableTitle
							value={cluster.title}
							onSave={(value) =>
								void updateCluster(cluster.id, { title: value })
							}
						/>
						<EditableDescription
							value={cluster.description || ''}
							onSave={(value) =>
								void updateCluster(cluster.id, {
									description: value || undefined,
								})
							}
						/>
						{parentClusters.length > 1 ? (
							<p className='mt-2 text-xs text-accent'>
								<Link2 className='mr-1 inline h-3 w-3' />
								Part of {parentClusters.length} clusters
							</p>
						) : null}
					</div>
					<div className='flex flex-wrap gap-2'>
						<Button
							variant='outline'
							size='sm'
							className='text-destructive hover:text-destructive'
							onClick={() => setDeleteOpen(true)}
						>
							<Trash2 className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => void handleNewSubCluster()}
						>
							<FolderPlus className='mr-1.5 h-4 w-4' />
							Sub-cluster
						</Button>
						<LinkClusterDialog clusterId={cluster.id} />
						<AddBlockDialog
							onAdd={(block: Block) => addBlockToCluster(cluster.id, block)}
						/>
					</div>
				</div>
			</section>

			<section className='container pb-8'>
				<div className='mb-3 flex items-center justify-between gap-4'>
					<h2 className='font-display text-lg font-semibold'>Graph</h2>
					<GraphSearch
						visibleClusterIds={(() => {
							const childIds = edges
								.filter((edge) => edge.sourceId === cluster.id)
								.map((edge) => edge.targetId);
							const parentIds = edges
								.filter((edge) => edge.targetId === cluster.id)
								.map((edge) => edge.sourceId);
							return [cluster.id, ...childIds, ...parentIds];
						})()}
						onNavigate={(clusterId) => navigate(`/cluster/${clusterId}`)}
						className='w-56'
					/>
				</div>
				<ClusterGraph clusterId={cluster.id} className='h-64' />
				<p className='mt-1.5 text-xs text-muted-foreground'>
					Double-click a neighbor to navigate · Drag to rearrange
				</p>
			</section>

			{childClusters.length > 0 ? (
				<section className='container pb-8'>
					<h2 className='mb-4 font-display text-lg font-semibold'>
						Nested Clusters
					</h2>
					<div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
						{childClusters.map((child, index) => (
							<ClusterCard key={child.id} cluster={child} index={index} />
						))}
					</div>
				</section>
			) : null}

			<section className='container pb-20'>
				{cluster.blocks.length > 0 ? (
					<h2 className='mb-4 font-display text-lg font-semibold'>Blocks</h2>
				) : null}
				<div className='columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4'>
					{cluster.blocks.map((block) => (
						<BlockCard key={block.id} block={block} clusterId={cluster.id} />
					))}
				</div>

				{cluster.blocks.length === 0 && childClusters.length === 0 ? (
					<div className='py-20 text-center text-muted-foreground'>
						<p className='font-display text-lg'>This cluster is empty</p>
						<p className='mt-1 text-sm'>
							Add blocks or link other clusters to get started.
						</p>
					</div>
				) : null}
			</section>

			<ConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title='Delete cluster?'
				description={`This permanently deletes “${cluster.title}” and all its blocks.`}
				confirmLabel='Delete'
				confirmVariant='destructive'
				onConfirm={handleDeleteCluster}
			/>
		</div>
	);
}
