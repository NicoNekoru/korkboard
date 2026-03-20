import { useEffect, useState } from 'react';

export interface ToastOptions {
	id?: string;
	title?: string;
	description?: string;
	variant?: 'default' | 'destructive';
	duration?: number;
}

interface ToastItem
	extends Required<Pick<ToastOptions, 'id' | 'variant' | 'duration'>> {
	title?: string;
	description?: string;
}

const listeners = new Set<(toasts: ToastItem[]) => void>();
let toasts: ToastItem[] = [];

function notify() {
	listeners.forEach((listener) => listener(toasts));
}

function removeToast(id: string) {
	toasts = toasts.filter((toast) => toast.id !== id);
	notify();
}

export function toast({
	id = crypto.randomUUID(),
	duration = 4000,
	variant = 'default',
	...rest
}: ToastOptions) {
	const nextToast: ToastItem = { id, duration, variant, ...rest };
	toasts = [nextToast, ...toasts].slice(0, 4);
	notify();

	window.setTimeout(() => removeToast(id), duration);

	return {
		id,
		dismiss: () => removeToast(id),
	};
}

export function useToast() {
	const [state, setState] = useState(toasts);

	useEffect(() => {
		listeners.add(setState);
		return () => {
			listeners.delete(setState);
		};
	}, []);

	return {
		toasts: state,
		toast,
		dismiss: removeToast,
	};
}
