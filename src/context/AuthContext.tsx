import { supabase } from '@/integrations/supabase/client';
import { NO_AUTH_MODE, NO_AUTH_USER } from '@/lib/noauth-data';
import type { Session, User } from '@supabase/supabase-js';
import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from 'react';

interface AuthContextType {
	user: User | null;
	session: Session | null;
	loading: boolean;
	signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
	signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
	signOut: () => Promise<void>;
	noAuthMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(
		NO_AUTH_MODE ? NO_AUTH_USER : null,
	);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(!NO_AUTH_MODE);

	useEffect(() => {
		if (NO_AUTH_MODE) {
			setSession(null);
			setUser(NO_AUTH_USER);
			setLoading(false);
			return;
		}

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);
		});

		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setUser(session?.user ?? null);
			setLoading(false);
		});

		return () => subscription.unsubscribe();
	}, []);

	const signUp = async (email: string, password: string) => {
		if (NO_AUTH_MODE) {
			return { error: null };
		}

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: window.location.origin },
		});
		return { error: error as Error | null };
	};

	const signIn = async (email: string, password: string) => {
		if (NO_AUTH_MODE) {
			return { error: null };
		}

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { error: error as Error | null };
	};

	const signOut = async () => {
		if (NO_AUTH_MODE) {
			return;
		}

		await supabase.auth.signOut();
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				loading,
				signUp,
				signIn,
				signOut,
				noAuthMode: NO_AUTH_MODE,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within an AuthProvider');
	return context;
}
