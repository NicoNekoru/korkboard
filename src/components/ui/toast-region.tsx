import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function ToastRegion() {
	const { toasts, dismiss } = useToast();

	return (
		<div className='pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-3'>
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={cn(
						'pointer-events-auto rounded-lg border bg-card p-4 shadow-lg',
						toast.variant === 'destructive' && 'border-destructive/40',
					)}
				>
					<div className='flex items-start gap-3'>
						<div className='min-w-0 flex-1'>
							{toast.title ? (
								<p className='text-sm font-semibold text-foreground'>
									{toast.title}
								</p>
							) : null}
							{toast.description ? (
								<p className='mt-1 text-sm text-muted-foreground'>
									{toast.description}
								</p>
							) : null}
						</div>
						<button
							type='button'
							aria-label='Dismiss notification'
							onClick={() => dismiss(toast.id)}
							className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
						>
							<X className='h-4 w-4' />
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
