import { useClusters } from '@/context/ClusterContext';
import type { Cluster } from '@/lib/types';
import { Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ClusterCard({ cluster }: { cluster: Cluster; index: number }) {
	const navigate = useNavigate();
	const { getChildClusters } = useClusters();

	const previewImages = cluster.blocks
		.filter((block) => block.type === 'image' && block.imageUrl)
		.slice(0, 3);
	const childCount = getChildClusters(cluster.id).length;

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
			className='group cursor-pointer transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
		>
			<div className='mb-3 grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-lg border border-border bg-secondary'>
				{previewImages.map((block, index) => (
					<div
						key={block.id}
						className={`overflow-hidden ${index === 0 ? 'row-span-2' : ''}`}
					>
						<img
							src={block.imageUrl}
							alt={block.title}
							className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
						/>
					</div>
				))}
				{previewImages.length < 3
					? ['empty-a', 'empty-b', 'empty-c']
							.slice(0, 3 - previewImages.length)
							.map((slot) => (
								<div
									key={slot}
									className='flex items-center justify-center bg-muted'
								>
									<Layers className='h-5 w-5 text-muted-foreground' />
								</div>
							))
					: null}
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
