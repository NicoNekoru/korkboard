import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Label = forwardRef<
	HTMLLabelElement,
	React.ComponentProps<'label'>
>(function Label({ className, ...props }, ref) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: generic label wrapper forwards htmlFor or nesting from callers.
		<label
			ref={ref}
			className={cn('text-sm font-medium leading-none', className)}
			{...props}
		/>
	);
});
