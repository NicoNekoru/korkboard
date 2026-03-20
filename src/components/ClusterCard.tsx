import { useClusters } from '@/context/ClusterContext';
import { isTauri } from '@/lib/db';
import type { Cluster } from '@/lib/types';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import {
	BookOpen,
	Download,
	FileText,
	Folder,
	Image as ImageIcon,
	Layers,
	Link2,
	Type,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ClusterCard({ cluster }: { cluster: Cluster; index: number }) {
	const navigate = useNavigate();
	const { getChildClusters } = useClusters();

	const children = getChildClusters(cluster.id);
	const childCount = children.length;

	const handleExport = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isTauri()) return;

		try {
			const savePath = await save({
				filters: [{ name: 'Korkboard Archive', extensions: ['kork'] }],
				defaultPath: `${cluster.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.kork`,
			});

			if (savePath) {
				const assetPaths = cluster.blocks
					.map((b) => b.imageUrl)
					.filter((path): path is string => !!path && !path.startsWith('http'));

				await invoke('export_board', {
					boardJson: JSON.stringify(cluster),
					assetPaths,
					savePath,
				});
			}
		} catch (error) {
			console.error('Export failed', error);
		}
	};

	// Gather preview items: first sub-clusters, then blocks
	const previewItems = [
		...children.map((c) => ({
			id: `cluster-${c.id}`,
			type: 'cluster',
			title: c.title,
			imageUrl: null,
		})),
		...cluster.blocks.map((b) => ({
			id: `block-${b.id}`,
			type: b.type,
			title: b.title,
			imageUrl: b.imageUrl,
		})),
	].slice(0, 4);

	const getPreviewIcon = (type: string) => {
		switch (type) {
			case 'cluster':
				return <Folder className='h-5 w-5 text-muted-foreground' />;
			case 'image':
				return <ImageIcon className='h-5 w-5 text-muted-foreground' />;
			case 'link':
				return <Link2 className='h-5 w-5 text-muted-foreground' />;
			case 'text':
				return <Type className='h-5 w-5 text-muted-foreground' />;
			case 'book':
				return <BookOpen className='h-5 w-5 text-muted-foreground' />;
			case 'pdf':
				return <FileText className='h-5 w-5 text-muted-foreground' />;
			default:
				return <FileText className='h-5 w-5 text-muted-foreground' />;
		}
	};

	return (
		<div
			role='button'
			tabIndex={0}
			onClick={() => navigate(`/cluster/${cluster.id}`)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					navigate(`/cluster/${cluster.id}`);
				}
			}}
			className='group cursor-pointer transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative'
		>
			<div
				className={`mb-3 grid aspect-[4/3] gap-px overflow-hidden rounded-lg border border-border bg-secondary ${previewItems.length > 0 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-1 grid-rows-1'}`}
			>
				{previewItems.length === 0 ? (
					<div className='flex items-center justify-center bg-muted'>
						<Layers className='h-8 w-8 text-muted-foreground/50' />
					</div>
				) : (
					previewItems.map((item, index) => {
						const isLarge = previewItems.length < 4 && index === 0;
						return (
							<div
								key={item.id}
								className={`flex flex-col items-center justify-center bg-muted overflow-hidden relative ${isLarge ? 'row-span-2' : ''}`}
							>
								{item.imageUrl ? (
									<img
										src={item.imageUrl}
										alt={item.title}
										className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
									/>
								) : (
									<div className='flex flex-col items-center justify-center p-2 text-center w-full h-full'>
										{getPreviewIcon(item.type)}
										{(isLarge || previewItems.length <= 2) && (
											<span className='mt-2 text-xs text-muted-foreground line-clamp-1 w-full px-2'>
												{item.title}
											</span>
										)}
									</div>
								)}
							</div>
						);
					})
				)}
				{previewItems.length > 0 && previewItems.length < 3
					? Array.from({ length: 3 - previewItems.length }).map((_, i) => (
							<div
								key={`empty-${i}`}
								className='flex items-center justify-center bg-muted/50'
							/>
						))
					: null}
			</div>

			<div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'>
				{isTauri() && (
					<button
						type='button'
						onClick={handleExport}
						className='rounded-md bg-background/80 p-1.5 shadow-sm hover:bg-background'
						title='Export Board'
					>
						<Download className='h-4 w-4 text-muted-foreground' />
					</button>
				)}
			</div>

			<h3 className='font-display text-base font-semibold transition-colors group-hover:text-accent'>
				{cluster.title}
			</h3>
			{cluster.description ? (
				<p className='mt-0.5 line-clamp-2 text-sm text-muted-foreground'>
					{cluster.description}
				</p>
			) : null}
			<p className='mt-1.5 text-xs text-muted-foreground'>
				{cluster.blocks.length} blocks
				{childCount > 0 ? ` · ${childCount} nested` : ''}
			</p>
		</div>
	);
}
