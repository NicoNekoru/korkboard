import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AuthPage() {
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const { signIn, signUp } = useAuth();
	const { toast } = useToast();

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);

		const { error } = isSignUp
			? await signUp(email, password)
			: await signIn(email, password);

		if (error) {
			toast({
				title: 'Error',
				description: error.message,
				variant: 'destructive',
			});
		} else if (isSignUp) {
			toast({
				title: 'Check your email',
				description: 'We sent you a confirmation link.',
			});
		}

		setLoading(false);
	};

	return (
		<div className='flex min-h-screen items-center justify-center bg-background px-4 relative'>
			<Link
				to='/'
				className='absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
			>
				<ArrowLeft className='h-4 w-4' />
				Back to Korkboard
			</Link>

			<div className='w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-lg'>
				<h1 className='mb-6 text-center font-display text-2xl font-bold'>
					{isSignUp ? 'Create Account' : 'Sign In'}
				</h1>

				<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
					<div>
						<Label htmlFor='email' className='text-xs text-muted-foreground'>
							Email
						</Label>
						<Input
							id='email'
							type='email'
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							required
							autoComplete='email'
						/>
					</div>
					<div>
						<Label htmlFor='password' className='text-xs text-muted-foreground'>
							Password
						</Label>
						<Input
							id='password'
							type='password'
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
							minLength={6}
							autoComplete={isSignUp ? 'new-password' : 'current-password'}
						/>
					</div>
					<Button type='submit' disabled={loading} className='w-full'>
						{loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
					</Button>
				</form>

				<p className='mt-4 text-center text-xs text-muted-foreground'>
					{isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
					<button
						type='button'
						onClick={() => setIsSignUp(!isSignUp)}
						className='text-primary underline hover:text-primary/80'
					>
						{isSignUp ? 'Sign in' : 'Sign up'}
					</button>
				</p>

				<div className='mt-6 border-t border-border pt-6 text-center'>
					<Link
						to='/'
						className='text-xs text-muted-foreground hover:text-foreground transition-colors'
					>
						Continue offline
					</Link>
				</div>
			</div>
		</div>
	);
}
