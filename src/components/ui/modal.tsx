import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function Modal({
	open,
	onOpenChange,
	title,
	description,
	children,
	className,
}: ModalProps) {
	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onOpenChange(false);
			}
		};

		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			document.body.style.overflow = '';
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [open, onOpenChange]);

	if (!open) {
		return null;
	}

	return createPortal(
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4'
			onMouseDown={() => onOpenChange(false)}
		>
			<div
				className={cn(
					'relative max-h-[85vh] w-full overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl',
					className,
				)}
				onMouseDown={(event) => event.stopPropagation()}
			>
				<button
					type='button'
					aria-label='Close'
					onClick={() => onOpenChange(false)}
					className='absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
				>
					<X className='h-4 w-4' />
				</button>
				{(title || description) && (
					<div className='mb-4 pr-8'>
						{title ? (
							<h2 className='font-display text-lg font-semibold text-foreground'>
								{title}
							</h2>
						) : null}
						{description ? (
							<p className='mt-1 text-sm text-muted-foreground'>
								{description}
							</p>
						) : null}
					</div>
				)}
				{children}
			</div>
		</div>,
		document.body,
	);
}
