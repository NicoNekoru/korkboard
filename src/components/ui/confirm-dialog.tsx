import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: 'default' | 'destructive';
	onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	confirmVariant = 'default',
	onConfirm,
}: ConfirmDialogProps) {
	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			className='max-w-md'
			title={title}
			description={description}
		>
			<div className='flex justify-end gap-2'>
				<Button variant='ghost' onClick={() => onOpenChange(false)}>
					{cancelLabel}
				</Button>
				<Button
					variant={confirmVariant}
					onClick={async () => {
						await onConfirm();
						onOpenChange(false);
					}}
				>
					{confirmLabel}
				</Button>
			</div>
		</Modal>
	);
}
