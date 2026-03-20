import { BlockDetailDialog } from '@/components/BlockDetailDialog';
import { Badge } from '@/components/ui/badge';
import { useClusters } from '@/context/ClusterContext';
import type { Block } from '@/lib/types';
import {
	BookOpen,
	ExternalLink,
	File,
	FileText,
	Image,
	Type,
} from 'lucide-react';
import { useState } from 'react';

const typeIcons: Record<string, React.ElementType> = {
	image: Image,
	link: ExternalLink,
	text: Type,
	book: BookOpen,
	pdf: File,
};

const typeLabels: Record<string, string> = {
	image: 'Image',
	link: 'Link',
	text: 'Note',
	book: 'Book',
	pdf: 'PDF',
};

const COLOR_DOT: Record<string, string> = {
	red: 'bg-red-500',
	orange: 'bg-orange-500',
	yellow: 'bg-yellow-500',
	green: 'bg-green-500',
	blue: 'bg-blue-500',
	purple: 'bg-purple-500',
	pink: 'bg-pink-500',
};

export function BlockCard({
	block,
	clusterId,
}: { block: Block; clusterId?: string }) {
	const Icon = typeIcons[block.type] || FileText;
	const [dialogOpen, setDialogOpen] = useState(false);
	const { updateBlock, deleteBlock, moveBlock, clusters } = useClusters();

	return (
		<>
			<div
				role='button'
				tabIndex={0}
				className='group mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
				onClick={() => setDialogOpen(true)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						setDialogOpen(true);
					}
				}}
			>
				{block.colorLabel ? (
					<div className={`h-1 w-full ${COLOR_DOT[block.colorLabel] || ''}`} />
				) : null}

				{block.type === 'image' && block.imageUrl ? (
					<div className='relative'>
						<img
							src={block.imageUrl}
							alt={block.title}
							className='w-full object-cover'
							loading='lazy'
						/>
						<div className='absolute inset-0 bg-foreground/0 transition-colors group-hover:bg-foreground/5' />
					</div>
				) : null}

				<div className='p-4'>
					<div className='mb-2 flex items-center gap-1.5'>
						<Icon className='h-3.5 w-3.5 text-muted-foreground' />
						<span className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
							{typeLabels[block.type]}
						</span>
					</div>

					<h3 className='mb-1 font-display text-sm font-semibold leading-snug transition-colors group-hover:text-accent'>
						{block.title}
					</h3>
					{block.author ? (
						<p className='mb-2 text-xs text-muted-foreground'>
							by {block.author}
						</p>
					) : null}
					{block.content ? (
						<p className='line-clamp-4 text-sm leading-relaxed text-muted-foreground'>
							{block.content}
						</p>
					) : null}
					{block.description && !block.content ? (
						<p className='line-clamp-3 text-xs leading-relaxed text-muted-foreground'>
							{block.description}
						</p>
					) : null}

					{block.url ? (
						<div className='mt-2 flex items-center gap-1 text-xs text-accent'>
							<ExternalLink className='h-3 w-3' />
							<span className='truncate'>{new URL(block.url).hostname}</span>
						</div>
					) : null}

					{block.tags && block.tags.length > 0 ? (
						<div className='mt-2 flex flex-wrap gap-1'>
							{block.tags.slice(0, 3).map((tag) => (
								<Badge
									key={tag}
									variant='secondary'
									className='px-1.5 py-0 text-[10px]'
								>
									{tag}
								</Badge>
							))}
							{block.tags.length > 3 ? (
								<span className='text-[10px] text-muted-foreground'>
									+{block.tags.length - 3}
								</span>
							) : null}
						</div>
					) : null}
				</div>
			</div>

			<BlockDetailDialog
				block={block}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSave={(blockId, updates) => updateBlock(blockId, updates)}
				onDelete={(blockId) => deleteBlock(blockId)}
				onMove={
					clusterId
						? (blockId, toClusterId) =>
								moveBlock(blockId, clusterId, toClusterId)
						: undefined
				}
				clusters={clusters}
				currentClusterId={clusterId}
			/>
		</>
	);
}
