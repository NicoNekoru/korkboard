import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useClusters } from '@/context/ClusterContext';
import { FileText, Layers, Search, Tag, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface SearchResult {
	id: string;
	type: 'cluster' | 'block';
	title: string;
	subtitle?: string;
	clusterId: string;
	matchField: string;
}

interface GraphSearchProps {
	onHighlight?: (clusterId: string | null) => void;
	onNavigate?: (clusterId: string) => void;
	visibleClusterIds?: string[];
	className?: string;
}

function useDebounce<T>(value: T, delay: number) {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), delay);
		return () => window.clearTimeout(timer);
	}, [delay, value]);

	return debounced;
}

export function GraphSearch({
	onHighlight,
	onNavigate,
	visibleClusterIds,
	className = '',
}: GraphSearchProps) {
	const { clusters } = useClusters();
	const [query, setQuery] = useState('');
	const debouncedQuery = useDebounce(query, 200);
	const [open, setOpen] = useState(false);
	const [selectedTag, setSelectedTag] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				inputRef.current?.focus();
				setOpen(true);
			}
		};

		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, []);

	useEffect(() => {
		const handler = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		const relevantClusters = visibleClusterIds
			? clusters.filter((cluster) => visibleClusterIds.includes(cluster.id))
			: clusters;

		for (const cluster of relevantClusters) {
			for (const block of cluster.blocks) {
				block.tags?.forEach((tag) => tagSet.add(tag));
			}
		}

		return Array.from(tagSet).sort();
	}, [clusters, visibleClusterIds]);

	const suggestedTags = useMemo(() => {
		if (!debouncedQuery.startsWith('#')) {
			return [];
		}

		const partial = debouncedQuery.slice(1).toLowerCase();
		return allTags
			.filter((tag) => tag.toLowerCase().includes(partial))
			.slice(0, 8);
	}, [allTags, debouncedQuery]);

	const results = useMemo<SearchResult[]>(() => {
		const normalizedQuery = selectedTag
			? ''
			: debouncedQuery.trim().toLowerCase();
		const tag = selectedTag;

		if (!normalizedQuery && !tag) {
			return [];
		}

		const relevantClusters = visibleClusterIds
			? clusters.filter((cluster) => visibleClusterIds.includes(cluster.id))
			: clusters;
		const output: SearchResult[] = [];

		for (const cluster of relevantClusters) {
			if (
				normalizedQuery &&
				cluster.title.toLowerCase().includes(normalizedQuery)
			) {
				output.push({
					id: cluster.id,
					type: 'cluster',
					title: cluster.title,
					subtitle: cluster.description,
					clusterId: cluster.id,
					matchField: 'title',
				});
			}

			for (const block of cluster.blocks) {
				let matched = false;
				let matchField = '';

				if (tag && block.tags?.includes(tag)) {
					matched = true;
					matchField = `tag: ${tag}`;
				} else if (normalizedQuery) {
					if (block.title.toLowerCase().includes(normalizedQuery)) {
						matched = true;
						matchField = 'title';
					} else if (
						block.tags?.some((value) =>
							value.toLowerCase().includes(normalizedQuery),
						)
					) {
						matched = true;
						matchField = `tag: ${block.tags.find((value) => value.toLowerCase().includes(normalizedQuery))}`;
					} else if (
						block.description?.toLowerCase().includes(normalizedQuery)
					) {
						matched = true;
						matchField = 'description';
					} else if (block.author?.toLowerCase().includes(normalizedQuery)) {
						matched = true;
						matchField = `author: ${block.author}`;
					}
				}

				if (matched) {
					output.push({
						id: block.id,
						type: 'block',
						title: block.title,
						subtitle: cluster.title,
						clusterId: cluster.id,
						matchField,
					});
				}
			}
		}

		return output.slice(0, 20);
	}, [clusters, debouncedQuery, selectedTag, visibleClusterIds]);

	const handleSelect = useCallback(
		(result: SearchResult) => {
			onHighlight?.(result.clusterId);
			onNavigate?.(result.clusterId);
			setOpen(false);
		},
		[onHighlight, onNavigate],
	);

	const handleTagSelect = useCallback((tag: string) => {
		setSelectedTag(tag);
		setQuery('');
		setOpen(true);
	}, []);

	const clearSearch = useCallback(() => {
		setQuery('');
		setSelectedTag(null);
		onHighlight?.(null);
		setOpen(false);
	}, [onHighlight]);

	const showDropdown =
		open && (results.length > 0 || suggestedTags.length > 0 || selectedTag);

	return (
		<div ref={containerRef} className={`relative ${className}`}>
			<div className='relative flex items-center gap-2'>
				<Search className='pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground' />
				{selectedTag ? (
					<Badge
						variant='secondary'
						className='absolute left-9 z-10 cursor-pointer text-xs'
						onClick={() => {
							setSelectedTag(null);
							onHighlight?.(null);
						}}
					>
						<Tag className='mr-1 h-3 w-3' />
						{selectedTag}
						<X className='ml-1 h-3 w-3' />
					</Badge>
				) : null}
				<Input
					ref={inputRef}
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setOpen(true);
						setSelectedTag(null);
					}}
					onFocus={() => setOpen(true)}
					placeholder={selectedTag ? '' : 'Search or ⌘K…'}
					className={`h-9 bg-background pl-9 pr-8 text-sm ${selectedTag ? 'pl-32' : ''}`}
				/>
				{query || selectedTag ? (
					<button
						type='button'
						onClick={clearSearch}
						className='absolute right-3 text-muted-foreground transition-colors hover:text-foreground'
					>
						<X className='h-4 w-4' />
					</button>
				) : null}
			</div>

			{showDropdown ? (
				<div className='absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg transition-all duration-150'>
					<div className='max-h-72 overflow-y-auto'>
						{suggestedTags.length > 0 && !selectedTag ? (
							<div className='border-b border-border p-2'>
								<p className='px-2 py-1 text-xs text-muted-foreground'>Tags</p>
								<div className='flex flex-wrap gap-1.5 px-2'>
									{suggestedTags.map((tag) => (
										<Badge
											key={tag}
											variant='outline'
											className='cursor-pointer text-xs transition-colors hover:bg-accent hover:text-accent-foreground'
											onClick={() => handleTagSelect(tag)}
										>
											<Tag className='mr-1 h-3 w-3' />
											{tag}
										</Badge>
									))}
								</div>
							</div>
						) : null}

						{results.length > 0 ? (
							<div className='p-1'>
								{results.map((result) => (
									<button
										key={`${result.type}-${result.id}`}
										type='button'
										className='flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground'
										onMouseEnter={() => onHighlight?.(result.clusterId)}
										onClick={() => handleSelect(result)}
									>
										{result.type === 'cluster' ? (
											<Layers className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
										) : (
											<FileText className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
										)}
										<div className='min-w-0 flex-1'>
											<p className='truncate text-sm font-medium'>
												{result.title}
											</p>
											<div className='flex items-center gap-2 text-xs text-muted-foreground'>
												{result.subtitle ? (
													<span className='truncate'>{result.subtitle}</span>
												) : null}
												<span className='shrink-0'>· {result.matchField}</span>
											</div>
										</div>
									</button>
								))}
							</div>
						) : null}

						{results.length === 0 && suggestedTags.length === 0 ? (
							<p className='py-6 text-center text-sm text-muted-foreground'>
								No results found
							</p>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
