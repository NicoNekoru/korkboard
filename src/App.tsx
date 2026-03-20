import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { ToastRegion } from '@/components/ui/toast-region';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ClusterProvider } from '@/context/ClusterContext';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ClusterPage from './pages/ClusterPage';
import GraphPage from './pages/GraphPage';
import Index from './pages/Index';
import NotFound from './pages/NotFound';

function AppRoutes() {
	const { user, loading } = useAuth();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	if (loading) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-background'>
				<p className='text-muted-foreground'>Loading...</p>
			</div>
		);
	}

	if (!user) {
		return (
			<Routes>
				<Route path='/auth' element={<AuthPage />} />
				<Route path='*' element={<Navigate to='/auth' replace />} />
			</Routes>
		);
	}

	return (
		<ClusterProvider>
			<div className='flex min-h-screen w-full bg-background'>
				<AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
				<div className='flex min-h-screen min-w-0 flex-1 flex-col md:pl-72'>
					<header className='sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background/90 px-4 backdrop-blur-md'>
						<Button
							variant='ghost'
							size='icon'
							className='md:hidden'
							onClick={() => setSidebarOpen((current) => !current)}
							aria-label='Toggle navigation'
						>
							<Menu className='h-5 w-5' />
						</Button>
					</header>
					<main className='min-w-0 flex-1'>
						<Routes>
							<Route path='/' element={<Index />} />
							<Route path='/cluster/:id' element={<ClusterPage />} />
							<Route path='/graph' element={<GraphPage />} />
							<Route path='/auth' element={<Navigate to='/' replace />} />
							<Route path='*' element={<NotFound />} />
						</Routes>
					</main>
				</div>
			</div>
		</ClusterProvider>
	);
}

const App = () => (
	<BrowserRouter>
		<AuthProvider>
			<AppRoutes />
			<ToastRegion />
		</AuthProvider>
	</BrowserRouter>
);

export default App;
