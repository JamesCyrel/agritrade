import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '../lib/supabase'; // <-- Import path fixed
import { Session } from '@supabase/supabase-js';

type AuthData = {
  session: Session | null;
  profile: any | null;
  loading: boolean;
};

export const AuthContext = createContext<AuthData | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to fetch profile safely
const getProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }
    // Return the first profile found, or null
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error('Exception in getProfile:', e);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const profileData = await getProfile(session.user.id);
        setProfile(profileData);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, deep link)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);

        if (session) {
          // This fixes the "Cannot coerce" error from your log
          // We use the safe getProfile function here now.
          const profileData = await getProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        // This check prevents the loading screen from flashing on every auth change
        if (loading) {
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [loading]); // We only want this effect to run once, but need loading to be in scope

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

