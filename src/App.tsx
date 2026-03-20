import { ToastRegion } from '@/components/ui/toast-region';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ClusterProvider } from '@/context/ClusterContext';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ClusterPage from './pages/ClusterPage';
import GraphPage from './pages/GraphPage';
import Index from './pages/Index';
import NotFound from './pages/NotFound';

function AppRoutes() {
	const { user, loading } = useAuth();

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
			<div className='flex min-h-screen w-full flex-col bg-background'>
				<main className='flex min-h-screen min-w-0 flex-1 flex-col'>
					<Routes>
						<Route path='/' element={<Index />} />
						<Route path='/cluster/:id' element={<ClusterPage />} />
						<Route path='/graph' element={<GraphPage />} />
						<Route path='/auth' element={<Navigate to='/' replace />} />
						<Route path='*' element={<NotFound />} />
					</Routes>
				</main>
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
