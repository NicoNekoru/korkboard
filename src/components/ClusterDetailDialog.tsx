import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import type { Cluster } from '@/lib/types';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const COLOR_OPTIONS = [
	{ value: 'red', bg: 'bg-red-500' },
	{ value: 'orange', bg: 'bg-orange-500' },
	{ value: 'yellow', bg: 'bg-yellow-500' },
	{ value: 'green', bg: 'bg-green-500' },
	{ value: 'blue', bg: 'bg-blue-500' },
	{ value: 'purple', bg: 'bg-purple-500' },
	{ value: 'pink', bg: 'bg-pink-500' },
];

const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 20;

interface ClusterDetailDialogProps {
	cluster: Cluster;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (id: string, updates: Partial<Cluster>) => void;
}

export function ClusterDetailDialog({
	cluster,
	open,
	onOpenChange,
	onSave,
}: ClusterDetailDialogProps) {
	const [note, setNote] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState('');
	const [colorLabel, setColorLabel] = useState<string | undefined>();
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		setNote(cluster.note || '');
		setTags(cluster.tags || []);
		setColorLabel(cluster.colorLabel);
		setDirty(false);
	}, [cluster]);

	const addTag = () => {
		const trimmed = tagInput.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
		if (trimmed && !tags.includes(trimmed) && tags.length < MAX_TAGS) {
			setTags([...tags, trimmed]);
			setDirty(true);
		}
		setTagInput('');
	};

	const removeTag = (tag: string) => {
		setTags(tags.filter((t) => t !== tag));
		setDirty(true);
	};

	const handleSave = () => {
		onSave(cluster.id, {
			note: note.trim(),
			tags,
			colorLabel,
			updatedAt: new Date().toISOString(),
		});
		setDirty(false);
		onOpenChange(false);
	};

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title='Cluster Settings'
			className='max-w-md'
		>
			<div className='space-y-6 pt-4'>
				<div>
					<Label className='mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider'>
						Color Label
					</Label>
					<div className='flex items-center gap-2'>
						{COLOR_OPTIONS.map((color) => (
							<button
								key={color.value}
								type='button'
								onClick={() => {
									setColorLabel(
										colorLabel === color.value ? undefined : color.value,
									);
									setDirty(true);
								}}
								className={`h-6 w-6 rounded-full transition-all ${color.bg} ${
									colorLabel === color.value
										? 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background'
										: 'opacity-60 hover:opacity-100'
								}`}
							/>
						))}
						{colorLabel ? (
							<button
								type='button'
								onClick={() => {
									setColorLabel(undefined);
									setDirty(true);
								}}
								className='ml-1 text-xs text-muted-foreground hover:text-foreground'
							>
								Clear
							</button>
						) : null}
					</div>
				</div>

				<div>
					<Label className='mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider'>
						Tags
					</Label>
					<div className='mb-3 flex flex-wrap gap-1.5'>
						{tags.map((tag) => (
							<Badge
								key={tag}
								variant='secondary'
								className='gap-1 pr-1 text-xs'
							>
								{tag}
								<button
									type='button'
									onClick={() => removeTag(tag)}
									className='hover:text-destructive'
								>
									<X className='h-3 w-3' />
								</button>
							</Badge>
						))}
					</div>
					<div className='flex gap-2'>
						<Input
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addTag();
								}
							}}
							placeholder='Add a tag…'
							className='h-8 text-sm'
						/>
						<Button
							variant='outline'
							size='sm'
							className='h-8 px-2'
							onClick={addTag}
						>
							<Plus className='h-3.5 w-3.5' />
						</Button>
					</div>
				</div>

				<div>
					<Label className='mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider'>
						Metanote
					</Label>
					<Textarea
						value={note}
						onChange={(e) => {
							setNote(e.target.value);
							setDirty(true);
						}}
						placeholder='Write a note about this cluster…'
						className='min-h-[100px] text-sm resize-none'
					/>
				</div>

				<div className='flex justify-end pt-2'>
					<Button onClick={handleSave} disabled={!dirty} className='w-full'>
						Save Changes
					</Button>
				</div>
			</div>
		</Modal>
	);
}
