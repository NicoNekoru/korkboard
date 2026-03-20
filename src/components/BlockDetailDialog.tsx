import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import type { Block, Cluster } from '@/lib/types';
import {
	ArrowRightLeft,
	BookOpen,
	Clock,
	ExternalLink,
	File,
	FileText,
	Image,
	Plus,
	Trash2,
	Type,
	X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
const MAX_NOTE_LENGTH = 2000;
const MAX_TAGS = 20;
const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 1000;
const MAX_CONTENT_LENGTH = 10000;
const MAX_AUTHOR_LENGTH = 200;
const MAX_URL_LENGTH = 2000;

const dateFormatter = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
});

function InlineEditField({
	value,
	onCommit,
	placeholder,
	maxLength,
	multiline = false,
	className = '',
}: {
	value: string;
	onCommit: (value: string) => void;
	placeholder?: string;
	maxLength?: number;
	multiline?: boolean;
	className?: string;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

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
		if (trimmed !== value) {
			onCommit(trimmed);
		} else {
			setDraft(value);
		}
		setEditing(false);
	};

	if (editing) {
		if (multiline) {
			return (
				<Textarea
					ref={inputRef as React.RefObject<HTMLTextAreaElement>}
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commit}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							setDraft(value);
							setEditing(false);
						}
					}}
					maxLength={maxLength}
					placeholder={placeholder}
					rows={3}
					className={`resize-none border-none bg-transparent px-1 focus-visible:ring-1 ${className}`}
				/>
			);
		}

		return (
			<Input
				ref={inputRef as React.RefObject<HTMLInputElement>}
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
				maxLength={maxLength}
				placeholder={placeholder}
				className={`h-auto border-none bg-transparent px-1 py-0 focus-visible:ring-1 ${className}`}
			/>
		);
	}

	return (
		<span
			role='button'
			tabIndex={0}
			onClick={() => setEditing(true)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					setEditing(true);
				}
			}}
			className={`inline-block cursor-text rounded px-1 -mx-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${!value ? 'italic text-muted-foreground/50' : ''} ${className}`}
			title='Click to edit'
		>
			{value || placeholder || 'Click to edit…'}
		</span>
	);
}

interface BlockDetailDialogProps {
	block: Block | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (blockId: string, updates: Partial<Block>) => void;
	onDelete?: (blockId: string) => void;
	onMove?: (blockId: string, toClusterId: string) => void;
	clusters?: Cluster[];
	currentClusterId?: string;
}

export function BlockDetailDialog({
	block,
	open,
	onOpenChange,
	onSave,
	onDelete,
	onMove,
	clusters,
	currentClusterId,
}: BlockDetailDialogProps) {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [content, setContent] = useState('');
	const [author, setAuthor] = useState('');
	const [url, setUrl] = useState('');
	const [note, setNote] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState('');
	const [colorLabel, setColorLabel] = useState<string | undefined>();
	const [dirty, setDirty] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	useEffect(() => {
		if (!block) {
			return;
		}

		setTitle(block.title);
		setDescription(block.description || '');
		setContent(block.content || '');
		setAuthor(block.author || '');
		setUrl(block.url || '');
		setNote(block.note || '');
		setTags(block.tags || []);
		setColorLabel(block.colorLabel);
		setDirty(false);
	}, [block]);

	if (!block) {
		return null;
	}

	const Icon = typeIcons[block.type] || FileText;
	const otherClusters =
		clusters?.filter((cluster) => cluster.id !== currentClusterId) || [];

	const addTag = () => {
		const trimmed = tagInput.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
		if (trimmed && !tags.includes(trimmed) && tags.length < MAX_TAGS) {
			setTags([...tags, trimmed]);
			setDirty(true);
		}
		setTagInput('');
	};

	const removeTag = (tag: string) => {
		setTags(tags.filter((value) => value !== tag));
		setDirty(true);
	};

	const updateField = <K extends keyof Block>(field: K, value: Block[K]) => {
		const setters: Record<string, (nextValue: string) => void> = {
			title: setTitle,
			description: setDescription,
			content: setContent,
			author: setAuthor,
			url: setUrl,
		};
		setters[field as string]?.(value as string);
		setDirty(true);
	};

	const handleSave = () => {
		onSave(block.id, {
			title: title.trim() || block.title,
			description: description.trim() || undefined,
			content: content.trim() || undefined,
			author: author.trim() || undefined,
			url: url.trim() || undefined,
			note: note.trim(),
			tags,
			colorLabel,
		});
		setDirty(false);
		onOpenChange(false);
	};

	const handleDelete = async () => {
		onDelete?.(block.id);
		onOpenChange(false);
	};

	return (
		<>
			<Modal open={open} onOpenChange={onOpenChange} className='max-w-lg'>
				<div className='space-y-4'>
					<div>
						<div className='flex items-center gap-2'>
							{colorLabel ? (
								<span
									className={`h-3 w-3 rounded-full ${COLOR_OPTIONS.find((color) => color.value === colorLabel)?.bg || ''}`}
								/>
							) : null}
							<Icon className='h-4 w-4 text-muted-foreground' />
							<span className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
								{typeLabels[block.type]}
							</span>
						</div>
						<h2 className='mt-1 font-display text-lg font-bold'>
							<InlineEditField
								value={title}
								onCommit={(value) => updateField('title', value)}
								maxLength={MAX_TITLE_LENGTH}
								placeholder='Untitled'
								className='font-display text-lg font-bold'
							/>
						</h2>
					</div>

					{block.type === 'image' && block.imageUrl ? (
						<img
							src={block.imageUrl}
							alt={title}
							className='max-h-64 w-full rounded-md object-cover'
						/>
					) : null}

					{block.type === 'book' || author ? (
						<div>
							<Label className='mb-1 block text-xs text-muted-foreground'>
								Author
							</Label>
							<InlineEditField
								value={author}
								onCommit={(value) => updateField('author', value)}
								maxLength={MAX_AUTHOR_LENGTH}
								placeholder='Add author…'
								className='text-sm'
							/>
						</div>
					) : null}

					<div>
						<Label className='mb-1 block text-xs text-muted-foreground'>
							Description
						</Label>
						<InlineEditField
							value={description}
							onCommit={(value) => updateField('description', value)}
							maxLength={MAX_DESC_LENGTH}
							placeholder='Add description…'
							multiline
							className='text-sm text-muted-foreground'
						/>
					</div>

					{block.type === 'text' || content ? (
						<div>
							<Label className='mb-1 block text-xs text-muted-foreground'>
								Content
							</Label>
							<InlineEditField
								value={content}
								onCommit={(value) => updateField('content', value)}
								maxLength={MAX_CONTENT_LENGTH}
								placeholder='Add content…'
								multiline
								className='text-sm'
							/>
						</div>
					) : null}

					{block.type === 'link' || block.type === 'pdf' || url ? (
						<div>
							<Label className='mb-1 block text-xs text-muted-foreground'>
								URL
							</Label>
							<InlineEditField
								value={url}
								onCommit={(value) => updateField('url', value)}
								maxLength={MAX_URL_LENGTH}
								placeholder='Add URL…'
								className='text-sm text-primary'
							/>
							{url ? (
								<a
									href={url}
									target='_blank'
									rel='noopener noreferrer'
									className='mt-1 flex items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80'
								>
									<ExternalLink className='h-3 w-3' />
									Open link
								</a>
							) : null}
						</div>
					) : null}

					<div className='border-t border-border' />

					<div>
						<Label className='mb-2 block text-xs text-muted-foreground'>
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
									className='ml-1 text-xs text-muted-foreground transition-colors hover:text-foreground'
								>
									Clear
								</button>
							) : null}
						</div>
					</div>

					<div>
						<Label className='mb-2 block text-xs text-muted-foreground'>
							Tags
						</Label>
						<div className='mb-2 flex flex-wrap gap-1.5'>
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
								onChange={(event) => setTagInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										addTag();
									}
								}}
								placeholder={
									tags.length >= MAX_TAGS ? 'Max tags reached' : 'Add a tag…'
								}
								className='h-8 text-sm'
								maxLength={MAX_TAG_LENGTH}
								disabled={tags.length >= MAX_TAGS}
							/>
							<Button
								variant='outline'
								size='sm'
								className='h-8 px-2'
								onClick={addTag}
								disabled={tags.length >= MAX_TAGS}
							>
								<Plus className='h-3.5 w-3.5' />
							</Button>
						</div>
					</div>

					<div>
						<Label className='mb-2 block text-xs text-muted-foreground'>
							Metanote{' '}
							<span className='text-muted-foreground/50'>
								({note.length}/{MAX_NOTE_LENGTH})
							</span>
						</Label>
						<Textarea
							value={note}
							onChange={(event) => {
								setNote(event.target.value.slice(0, MAX_NOTE_LENGTH));
								setDirty(true);
							}}
							placeholder='Write a note about this block…'
							className='min-h-[80px] resize-none text-sm'
							maxLength={MAX_NOTE_LENGTH}
						/>
					</div>

					{onMove && otherClusters.length > 0 ? (
						<div>
							<Label className='mb-2 block text-xs text-muted-foreground'>
								Move to Cluster
							</Label>
							<div className='relative'>
								<ArrowRightLeft className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
								<select
									defaultValue=''
									onChange={(event) => {
										const nextClusterId = event.target.value;
										if (!nextClusterId) {
											return;
										}
										onMove(block.id, nextClusterId);
										onOpenChange(false);
									}}
									className='flex h-9 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
								>
									<option value=''>Select cluster…</option>
									{otherClusters.map((cluster) => (
										<option key={cluster.id} value={cluster.id}>
											{cluster.title}
										</option>
									))}
								</select>
							</div>
						</div>
					) : null}

					<div className='flex items-center gap-4 text-xs text-muted-foreground'>
						<div className='flex items-center gap-1'>
							<Clock className='h-3 w-3' />
							Created {dateFormatter.format(new Date(block.createdAt))}
						</div>
						{block.updatedAt && block.updatedAt !== block.createdAt ? (
							<div className='flex items-center gap-1'>
								<Clock className='h-3 w-3' />
								Updated {dateFormatter.format(new Date(block.updatedAt))}
							</div>
						) : null}
					</div>

					<div className='mt-1 flex gap-2'>
						{onDelete ? (
							<Button
								variant='destructive'
								size='sm'
								className='gap-1.5'
								onClick={() => setConfirmDeleteOpen(true)}
							>
								<Trash2 className='h-3.5 w-3.5' />
								Delete
							</Button>
						) : null}
						{dirty ? (
							<Button onClick={handleSave} className='flex-1'>
								Save Changes
							</Button>
						) : null}
					</div>
				</div>
			</Modal>

			<ConfirmDialog
				open={confirmDeleteOpen}
				onOpenChange={setConfirmDeleteOpen}
				title='Delete block?'
				description={`This permanently deletes “${title}”.`}
				confirmLabel='Delete'
				confirmVariant='destructive'
				onConfirm={handleDelete}
			/>
		</>
	);
}
