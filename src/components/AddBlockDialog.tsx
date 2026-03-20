import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import type { Block, BlockType } from '@/lib/types';
import { BookOpen, ExternalLink, File, Image, Plus, Type } from 'lucide-react';
import { useState } from 'react';

const blockTypes: {
	type: BlockType;
	label: string;
	icon: React.ElementType;
}[] = [
	{ type: 'image', label: 'Image', icon: Image },
	{ type: 'link', label: 'Link', icon: ExternalLink },
	{ type: 'text', label: 'Note', icon: Type },
	{ type: 'book', label: 'Book', icon: BookOpen },
	{ type: 'pdf', label: 'PDF', icon: File },
];

const MAX_TITLE = 200;
const MAX_DESC = 1000;
const MAX_URL = 2000;
const MAX_AUTHOR = 200;
const MAX_CONTENT = 5000;

export function AddBlockDialog({ onAdd }: { onAdd: (block: Block) => void }) {
	const [open, setOpen] = useState(false);
	const [selectedType, setSelectedType] = useState<BlockType | null>(null);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [url, setUrl] = useState('');
	const [author, setAuthor] = useState('');
	const [content, setContent] = useState('');

	const reset = () => {
		setSelectedType(null);
		setTitle('');
		setDescription('');
		setUrl('');
		setAuthor('');
		setContent('');
	};

	const handleSubmit = () => {
		const trimmedTitle = title.trim().slice(0, MAX_TITLE);
		if (!selectedType || !trimmedTitle) {
			return;
		}

		const cleanedUrl = url.trim().slice(0, MAX_URL) || undefined;

		onAdd({
			id: crypto.randomUUID(),
			type: selectedType,
			title: trimmedTitle,
			description: description.trim().slice(0, MAX_DESC) || undefined,
			url: cleanedUrl,
			imageUrl: selectedType === 'image' ? cleanedUrl : undefined,
			author: author.trim().slice(0, MAX_AUTHOR) || undefined,
			content: content.trim().slice(0, MAX_CONTENT) || undefined,
			createdAt: new Date().toISOString(),
		});

		reset();
		setOpen(false);
	};

	return (
		<>
			<Button
				variant='outline'
				size='sm'
				className='gap-1.5 font-display'
				onClick={() => setOpen(true)}
			>
				<Plus className='h-4 w-4' />
				Add Block
			</Button>

			<Modal
				open={open}
				onOpenChange={(nextOpen) => {
					setOpen(nextOpen);
					if (!nextOpen) {
						reset();
					}
				}}
				className='max-w-md'
				title='Add a new block'
			>
				{!selectedType ? (
					<div className='grid grid-cols-2 gap-2 pt-2'>
						{blockTypes.map(({ type, label, icon: Icon }) => (
							<button
								key={type}
								type='button'
								onClick={() => setSelectedType(type)}
								className='flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-accent hover:bg-accent/5'
							>
								<Icon className='h-5 w-5 text-muted-foreground' />
								<span className='font-display text-sm font-medium'>
									{label}
								</span>
							</button>
						))}
					</div>
				) : (
					<div className='space-y-3 pt-2'>
						<Input
							placeholder='Title'
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							className='font-display'
							maxLength={MAX_TITLE}
						/>

						{selectedType === 'image' || selectedType === 'link' ? (
							<Input
								placeholder={selectedType === 'image' ? 'Image URL' : 'URL'}
								value={url}
								onChange={(event) => setUrl(event.target.value)}
								maxLength={MAX_URL}
							/>
						) : null}

						{selectedType === 'text' ? (
							<Textarea
								placeholder='Write your note...'
								value={content}
								onChange={(event) => setContent(event.target.value)}
								rows={4}
								maxLength={MAX_CONTENT}
							/>
						) : null}

						{selectedType === 'book' || selectedType === 'pdf' ? (
							<Input
								placeholder='Author'
								value={author}
								onChange={(event) => setAuthor(event.target.value)}
								maxLength={MAX_AUTHOR}
							/>
						) : null}

						{selectedType !== 'text' ? (
							<Textarea
								placeholder='Description (optional)'
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								rows={2}
								maxLength={MAX_DESC}
							/>
						) : null}

						<div className='flex justify-end gap-2 pt-1'>
							<Button
								variant='ghost'
								size='sm'
								onClick={() => setSelectedType(null)}
							>
								Back
							</Button>
							<Button size='sm' onClick={handleSubmit} disabled={!title.trim()}>
								Add
							</Button>
						</div>
					</div>
				)}
			</Modal>
		</>
	);
}
