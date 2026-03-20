import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { useClusters } from '@/context/ClusterContext';
import type { Cluster, ClusterEdge } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
	ChevronRight,
	FolderPlus,
	Home,
	Layers,
	Network,
	Pencil,
	Plus,
	Trash2,
	X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AppSidebarProps {
	open: boolean;
	onClose: () => void;
}

function ClusterTreeItem({
	cluster,
	depth = 0,
	onNavigate,
}: { cluster: Cluster; depth?: number; onNavigate: () => void }) {
	const navigate = useNavigate();
	const location = useLocation();
	const {
		getChildClusters,
		addCluster,
		addEdge,
		deleteCluster,
		updateCluster,
	} = useClusters();
	const [isOpen, setIsOpen] = useState(depth < 1);
	const [renaming, setRenaming] = useState(false);
	const [renameDraft, setRenameDraft] = useState(cluster.title);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const renameRef = useRef<HTMLInputElement>(null);

	const children = getChildClusters(cluster.id);
	const isActive = location.pathname === `/cluster/${cluster.id}`;
	const hasChildren = children.length > 0;

	useEffect(() => {
		if (renaming) {
			renameRef.current?.focus();
			renameRef.current?.select();
		}
	}, [renaming]);

	useEffect(() => {
		setRenameDraft(cluster.title);
	}, [cluster.title]);

	const commitRename = () => {
		const trimmed = renameDraft.trim();
		if (trimmed && trimmed !== cluster.title) {
			void updateCluster(cluster.id, { title: trimmed });
		} else {
			setRenameDraft(cluster.title);
		}
		setRenaming(false);
	};

	const handleNavigate = () => {
		navigate(`/cluster/${cluster.id}`);
		onNavigate();
	};

	const handleSubCluster = async () => {
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
		onNavigate();
	};

	const handleDelete = async () => {
		await deleteCluster(cluster.id);
		if (isActive) {
			navigate('/');
		}
		onNavigate();
	};

	return (
		<>
			<li className='space-y-1'>
				<div
					className={cn(
						'group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors',
						isActive
							? 'bg-sidebar-accent text-sidebar-accent-foreground'
							: 'hover:bg-sidebar-accent/60',
					)}
					style={{ paddingLeft: `${depth * 12 + 8}px` }}
				>
					{hasChildren ? (
						<button
							type='button'
							aria-label={isOpen ? 'Collapse cluster' : 'Expand cluster'}
							onClick={() => setIsOpen((current) => !current)}
							className='rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-border hover:text-foreground'
						>
							<ChevronRight
								className={cn(
									'h-3.5 w-3.5 transition-transform',
									isOpen && 'rotate-90',
								)}
							/>
						</button>
					) : (
						<span className='w-6' />
					)}

					<button
						type='button'
						onClick={handleNavigate}
						className='flex min-w-0 flex-1 items-center gap-2 text-left'
					>
						<Layers className='h-4 w-4 shrink-0' />
						{renaming ? (
							<Input
								ref={renameRef}
								value={renameDraft}
								onChange={(event) => setRenameDraft(event.target.value)}
								onBlur={commitRename}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										commitRename();
									}
									if (event.key === 'Escape') {
										setRenameDraft(cluster.title);
										setRenaming(false);
									}
								}}
								onClick={(event) => event.stopPropagation()}
								className='h-7 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-1'
								maxLength={120}
							/>
						) : (
							<span className='truncate'>{cluster.title}</span>
						)}
					</button>

					<div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
						<button
							type='button'
							aria-label='Rename cluster'
							onClick={() => setRenaming(true)}
							className='rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-border hover:text-foreground'
						>
							<Pencil className='h-3.5 w-3.5' />
						</button>
						<button
							type='button'
							aria-label='Add sub-cluster'
							onClick={() => void handleSubCluster()}
							className='rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-border hover:text-foreground'
						>
							<FolderPlus className='h-3.5 w-3.5' />
						</button>
						<button
							type='button'
							aria-label='Delete cluster'
							onClick={() => setDeleteOpen(true)}
							className='rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'
						>
							<Trash2 className='h-3.5 w-3.5' />
						</button>
					</div>
				</div>

				{hasChildren && isOpen ? (
					<ul className='space-y-1'>
						{children.map((child) => (
							<ClusterTreeItem
								key={child.id}
								cluster={child}
								depth={depth + 1}
								onNavigate={onNavigate}
							/>
						))}
					</ul>
				) : null}
			</li>

			<ConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title='Delete cluster?'
				description={`This permanently deletes “${cluster.title}” and all of its blocks.`}
				confirmLabel='Delete'
				confirmVariant='destructive'
				onConfirm={handleDelete}
			/>
		</>
	);
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { getRootClusters, addCluster } = useClusters();

	const rootClusters = getRootClusters();

	const handleNewCluster = async () => {
		const newCluster: Cluster = {
			id: crypto.randomUUID(),
			title: 'New Cluster',
			blocks: [],
			createdAt: new Date().toISOString(),
		};
		await addCluster(newCluster);
		navigate(`/cluster/${newCluster.id}`);
		onClose();
	};

	const navItemClass = (active: boolean) =>
		cn(
			'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
			active
				? 'bg-sidebar-accent text-sidebar-accent-foreground'
				: 'hover:bg-sidebar-accent/60',
		);

	return (
		<>
			<button
				type='button'
				aria-label='Close navigation overlay'
				className={cn(
					'fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden',
					open ? 'opacity-100' : 'pointer-events-none opacity-0',
				)}
				onClick={onClose}
			/>
			<aside
				className={cn(
					'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:z-30 md:translate-x-0',
					open ? 'translate-x-0' : '-translate-x-full',
				)}
			>
				<div className='flex items-center justify-between border-b border-sidebar-border px-4 py-3'>
					<button
						type='button'
						onClick={() => {
							navigate('/');
							onClose();
						}}
						className='flex items-center gap-2 font-display text-lg font-bold tracking-tight'
					>
						<Layers className='h-5 w-5 text-accent' />
						<span>korkboard</span>
					</button>
					<Button
						variant='ghost'
						size='icon'
						className='md:hidden'
						onClick={onClose}
						aria-label='Close navigation'
					>
						<X className='h-4 w-4' />
					</Button>
				</div>

				<nav className='flex-1 overflow-y-auto px-3 py-4'>
					<div className='space-y-1'>
						<button
							type='button'
							onClick={() => {
								navigate('/');
								onClose();
							}}
							className={navItemClass(location.pathname === '/')}
						>
							<Home className='h-4 w-4' />
							Home
						</button>
						<button
							type='button'
							onClick={() => {
								navigate('/graph');
								onClose();
							}}
							className={navItemClass(location.pathname === '/graph')}
						>
							<Network className='h-4 w-4' />
							Graph View
						</button>
					</div>

					<div className='mt-6 space-y-3'>
						<div className='flex items-center justify-between px-3'>
							<h2 className='text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
								Clusters
							</h2>
							<button
								type='button'
								aria-label='Create cluster'
								onClick={() => void handleNewCluster()}
								className='rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground'
							>
								<Plus className='h-4 w-4' />
							</button>
						</div>
						{rootClusters.length === 0 ? (
							<p className='px-3 text-sm text-muted-foreground'>
								No clusters yet.
							</p>
						) : (
							<ul className='space-y-1'>
								{rootClusters.map((cluster) => (
									<ClusterTreeItem
										key={cluster.id}
										cluster={cluster}
										onNavigate={onClose}
									/>
								))}
							</ul>
						)}
					</div>
				</nav>
			</aside>
		</>
	);
}
