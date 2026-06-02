/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { supabase } from '../services/supabaseClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [userProfiles, setUserProfiles] = useState([]);
  const [myList, setMyList] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  
  const [modalContent, setModalContent] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [isTMDBSettingsOpen, setIsTMDBSettingsOpen] = useState(false);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Migrate sandbox user data to database on successful confirmation
  const migrateSandboxData = useCallback(async (sandboxUserId, realUserId) => {
    try {
      const profilesCached = localStorage.getItem(`andscene_sandbox_profiles_${sandboxUserId}`);
      if (!profilesCached) return;

      const tempProfiles = JSON.parse(profilesCached);
      if (!tempProfiles || tempProfiles.length === 0) return;

      showToast('Migrating your sandbox profile and list settings...');

      for (const tempProf of tempProfiles) {
        const { data: dbProfile, error: profileErr } = await supabase
          .from('profiles')
          .insert([{ user_id: realUserId, name: tempProf.name, avatar_url: tempProf.avatar_url }])
          .select()
          .single();

        if (profileErr) {
          console.error('Error migrating profile', profileErr);
          continue;
        }

        const newProfileId = dbProfile.id;

        const watchlistCached = localStorage.getItem(`andscene_sandbox_watchlist_${tempProf.id}`);
        if (watchlistCached) {
          const tempWatchlist = JSON.parse(watchlistCached);
          for (const item of tempWatchlist) {
            await supabase.from('watchlist').insert([{
              profile_id: newProfileId,
              user_id: realUserId,
              media_id: item.id,
              media_type: item.type === 'series' ? 'tv' : 'movie',
              title: item.title,
              poster_path: item.poster,
              backdrop_path: item.backdrop,
              vote_average: item.vote_average || 7.5,
              release_date: item.release_date || `${item.year || 2025}-01-01`
            }]);
          }
          localStorage.removeItem(`andscene_sandbox_watchlist_${tempProf.id}`);
        }

        const continueCached = localStorage.getItem(`andscene_sandbox_continue_${tempProf.id}`);
        if (continueCached) {
          const tempContinue = JSON.parse(continueCached);
          for (const item of tempContinue) {
            await supabase.from('continue_watching').insert([{
              profile_id: newProfileId,
              user_id: realUserId,
              media_id: item.id,
              media_type: item.type === 'series' ? 'tv' : 'movie',
              title: item.title,
              poster_path: item.poster,
              progress: item.progress,
              season: item.season || null,
              episode: item.episode || null,
              last_watched: new Date().toISOString()
            }]);
          }
          localStorage.removeItem(`andscene_sandbox_continue_${tempProf.id}`);
        }
      }

      localStorage.removeItem(`andscene_sandbox_profiles_${sandboxUserId}`);
      showToast('All sandbox profiles and lists successfully migrated!');
    } catch (err) {
      console.error('Data migration failed', err);
    }
  }, [showToast]);

  // Listen for Auth changes & fetch active session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const realUser = { 
          email: session.user.email, 
          id: session.user.id,
          emailConfirmed: !!session.user.email_confirmed_at
        };
        setUser(realUser);

        // Check if there is sandbox data to migrate
        const cachedSandbox = localStorage.getItem('andscene_sandbox_user');
        if (cachedSandbox) {
          const sandbox = JSON.parse(cachedSandbox);
          if (sandbox.email === realUser.email) {
            await migrateSandboxData(sandbox.id, realUser.id);
          }
          localStorage.removeItem('andscene_sandbox_user');
        }
      } else {
        const cachedSandbox = localStorage.getItem('andscene_sandbox_user');
        if (cachedSandbox) {
          setUser(JSON.parse(cachedSandbox));
        } else {
          setUser(null);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const realUser = { 
          email: session.user.email, 
          id: session.user.id,
          emailConfirmed: !!session.user.email_confirmed_at
        };
        setUser(realUser);

        // Check if there is sandbox data to migrate
        const cachedSandbox = localStorage.getItem('andscene_sandbox_user');
        if (cachedSandbox) {
          const sandbox = JSON.parse(cachedSandbox);
          if (sandbox.email === realUser.email) {
            await migrateSandboxData(sandbox.id, realUser.id);
          }
          localStorage.removeItem('andscene_sandbox_user');
        }
      } else {
        const cachedSandbox = localStorage.getItem('andscene_sandbox_user');
        if (cachedSandbox) {
          setUser(JSON.parse(cachedSandbox));
        } else {
          setUser(null);
          setActiveProfile(null);
          setUserProfiles([]);
          setMyList([]);
          setContinueWatching([]);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [migrateSandboxData]);

  // Fetch profiles when user is loaded
  const fetchProfiles = useCallback(async (userId) => {
    if (!userId) return;
    if (user?.isTemp) {
      const cached = localStorage.getItem(`andscene_sandbox_profiles_${userId}`);
      setUserProfiles(cached ? JSON.parse(cached) : []);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      setUserProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles', err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchProfiles(user.id);
    } else {
      setUserProfiles([]);
    }
  }, [user, fetchProfiles]);

  // Create new user profile
  const createProfile = useCallback(async (name) => {
    if (!user?.id) return;
    const randomSeed = Math.floor(Math.random() * 1000);
    const avatarUrl = `https://picsum.photos/seed/prof${randomSeed}/200/200`;

    if (user?.isTemp) {
      const newProfile = {
        id: `temp-profile-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        name,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString()
      };
      setUserProfiles(prev => {
        const updated = [...prev, newProfile];
        localStorage.setItem(`andscene_sandbox_profiles_${user.id}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Profile "${name}" created!`);
      return newProfile;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ user_id: user.id, name, avatar_url: avatarUrl }])
        .select()
        .single();
      if (error) throw error;

      setUserProfiles(prev => [...prev, data]);
      showToast(`Profile "${name}" created!`);
      return data;
    } catch (err) {
      showToast(err.message);
      console.error('Error creating profile', err);
    }
  }, [user, showToast]);

  // Sync Watchlist when activeProfile changes
  useEffect(() => {
    const loadWatchlist = async () => {
      if (!activeProfile?.id) {
        setMyList([]);
        return;
      }
      if (user?.isTemp) {
        const cached = localStorage.getItem(`andscene_sandbox_watchlist_${activeProfile.id}`);
        setMyList(cached ? JSON.parse(cached) : []);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('watchlist')
          .select('*')
          .eq('profile_id', activeProfile.id);
        if (error) throw error;

        const mappedList = (data || []).map(row => ({
          id: row.media_id,
          title: row.title,
          type: row.media_type === 'tv' ? 'series' : 'movie',
          poster: row.poster_path,
          backdrop: row.backdrop_path,
          rating: row.vote_average ? Math.floor(row.vote_average * 10) : 80,
          match: row.vote_average ? Math.floor(row.vote_average * 10) : 80,
          year: row.release_date ? parseInt(row.release_date.split('-')[0]) : 2025,
        }));
        setMyList(mappedList);
      } catch (err) {
        console.error('Error loading watchlist', err);
      }
    };

    loadWatchlist();
  }, [activeProfile, user]);

  // Sync Continue Watching when activeProfile changes
  useEffect(() => {
    const loadContinueWatching = async () => {
      if (!activeProfile?.id) {
        setContinueWatching([]);
        return;
      }
      if (user?.isTemp) {
        const cached = localStorage.getItem(`andscene_sandbox_continue_${activeProfile.id}`);
        setContinueWatching(cached ? JSON.parse(cached) : []);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('continue_watching')
          .select('*')
          .eq('profile_id', activeProfile.id)
          .order('last_watched', { ascending: false });
        if (error) throw error;

        const mappedList = (data || []).map(row => ({
          id: row.media_id,
          title: row.title,
          type: row.media_type === 'tv' ? 'series' : 'movie',
          poster: row.poster_path,
          progress: row.progress,
          season: row.season || null,
          episode: row.episode || null,
        }));
        setContinueWatching(mappedList);
      } catch (err) {
        console.error('Error loading continue watching history', err);
      }
    };

    loadContinueWatching();
  }, [activeProfile, user]);

const login = useCallback(async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('User not found')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          showToast(signUpError.message);
          throw signUpError;
        }
        if (signUpData.user) {
          showToast('Account created successfully!');
          setUser({ email: signUpData.user.email, id: signUpData.user.id });
          return signUpData.user;
        }
      }
      showToast(error.message);
      throw error;
    }
    if (data.user) {
      // Fetch admin role from roles table
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('is_admin')
        .eq('user_id', data.user.id)
        .single();
      if (roleError) console.error('Error fetching role', roleError);
      const isAdmin = roleData?.is_admin || false;
      showToast('Logged in successfully!');
      setUser({ email: data.user.email, id: data.user.id, isAdmin });
      return data.user;
    }
  } catch (err) {
    console.error('Auth error', err);
    throw err;
  }
}, [showToast]);

  const signup = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        showToast(error.message);
        throw error;
      }
      if (data.user) {
        const session = await supabase.auth.getSession();
        if (session?.data?.session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('user_id', data.user.id)
            .single();

          showToast('Account created and logged in!');
          setUser({ 
            email: data.user.email, 
            id: data.user.id, 
            emailConfirmed: !!session.data.session.user.email_confirmed_at,
            isAdmin: profile?.is_admin || false
          });
        } else {
          showToast('Verification email sent! Please check your inbox.');
        }
        return data.user;
      }
    } catch (err) {
      console.error('Signup error', err);
      throw err;
    }
  }, [showToast]);

  const loginSandbox = useCallback((email, tempId) => {
    const sandboxUser = {
      email,
      id: tempId || `temp-${Math.random().toString(36).substr(2, 9)}`,
      isTemp: true,
      emailConfirmed: false
    };
    localStorage.setItem('andscene_sandbox_user', JSON.stringify(sandboxUser));
    setUser(sandboxUser);
    showToast('Signed in to Sandbox mode (Verify later)');
  }, [showToast]);

  const resendVerificationEmail = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) {
        if (error.status === 429 || error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('exceeded')) {
          showToast('Email limit exceeded. Please wait a few minutes before requesting another link.');
        } else {
          showToast(error.message);
        }
        return false;
      }
      showToast('Verification email resent! Please check your inbox.');
      return true;
    } catch (err) {
      showToast(err.message || 'Failed to resend verification.');
      return false;
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('andscene_sandbox_user');
      setUser(null);
      setActiveProfile(null);
      setUserProfiles([]);
      setMyList([]);
      setContinueWatching([]);
      showToast('Logged out successfully');
    } catch (err) {
      console.error('Logout error', err);
    }
  }, [showToast]);

  // ----- Admin User Management Functions -----
  // Fetch all user profiles (admin view)
  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching users', err);
      showToast(err.message);
      return [];
    }
  }, []);

  // Update user profile (admin)
  const updateUser = useCallback(async (userId, updateData) => {
    try {
      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;
      showToast('User updated successfully');
    } catch (err) {
      console.error('Error updating user', err);
      showToast(err.message);
    }
  }, []);

  // Delete user profile (admin)
  const deleteUser = useCallback(async (userId) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      showToast('User deleted');
    } catch (err) {
      console.error('Error deleting user', err);
      showToast(err.message);
    }
  }, []);

  // Reset user password via Supabase email reset flow
  const resetUserPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      showToast('Password reset email sent');
    } catch (err) {
      console.error('Error resetting password', err);
      showToast(err.message);
    }
  }, []);

  // ----- End Admin Functions -----

  const addToMyList = useCallback(async (item) => {
    if (!activeProfile?.id || !user?.id) {
      setMyList(prev => {
        if (prev.find(i => i.id === item.id)) return prev;
        return [...prev, item];
      });
      showToast(`Added "${item.title}" to My List`);
      return;
    }
    if (user?.isTemp) {
      setMyList(prev => {
        if (prev.find(i => i.id === item.id)) return prev;
        const updated = [...prev, item];
        localStorage.setItem(`andscene_sandbox_watchlist_${activeProfile.id}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Added "${item.title}" to My List`);
      return;
    }
    try {
      const { error } = await supabase
        .from('watchlist')
        .insert([{
          profile_id: activeProfile.id,
          user_id: user.id,
          media_id: item.id,
          media_type: item.type === 'series' ? 'tv' : 'movie',
          title: item.title,
          poster_path: item.poster,
          backdrop_path: item.backdrop,
          vote_average: item.vote_average || item.match / 10 || 7.5,
          release_date: item.release_date || `${item.year || 2025}-01-01`,
        }]);

      if (error) throw error;

      setMyList(prev => [...prev, item]);
      showToast(`Added "${item.title}" to My List`);
    } catch (err) {
      showToast(err.message);
      console.error('Error adding to watchlist', err);
    }
  }, [activeProfile, user, showToast]);

  const removeFromMyList = useCallback(async (itemId) => {
    if (!activeProfile?.id) {
      const item = myList.find(i => i.id === itemId);
      setMyList(prev => prev.filter(i => i.id !== itemId));
      if (item) showToast(`Removed "${item.title}" from My List`);
      return;
    }
    if (user?.isTemp) {
      const item = myList.find(i => i.id === itemId);
      setMyList(prev => {
        const updated = prev.filter(i => i.id !== itemId);
        localStorage.setItem(`andscene_sandbox_watchlist_${activeProfile.id}`, JSON.stringify(updated));
        return updated;
      });
      if (item) showToast(`Removed "${item.title}" from My List`);
      return;
    }
    try {
      const item = myList.find(i => i.id === itemId);
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('profile_id', activeProfile.id)
        .eq('media_id', itemId);

      if (error) throw error;

      setMyList(prev => prev.filter(i => i.id !== itemId));
      if (item) showToast(`Removed "${item.title}" from My List`);
    } catch (err) {
      showToast(err.message);
      console.error('Error removing from watchlist', err);
    }
  }, [activeProfile, myList, showToast, user]);

  const toggleMyList = useCallback((item) => {
    if (myList.find(i => i.id === item.id)) {
      removeFromMyList(item.id);
    } else {
      addToMyList(item);
    }
  }, [myList, addToMyList, removeFromMyList]);

  const isInMyList = useCallback((itemId) => {
    return myList.some(i => i.id === itemId);
  }, [myList]);

  const openModal = useCallback((content) => {
    setModalContent(content);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setModalContent(null);
    document.body.style.overflow = 'auto';
  }, []);

  const addToContinueWatching = useCallback(async (item) => {
    const progressVal = Math.floor(Math.random() * 80) + 10;
    
    if (!activeProfile?.id || !user?.id) {
      setContinueWatching(prev => {
        const historyItem = { ...item, progress: progressVal };
        const filtered = prev.filter(i => i.id !== item.id);
        return [historyItem, ...filtered].slice(0, 20);
      });
      return;
    }
    if (user?.isTemp) {
      setContinueWatching(prev => {
        const historyItem = { ...item, progress: progressVal };
        const filtered = prev.filter(i => i.id !== item.id);
        const updated = [historyItem, ...filtered].slice(0, 20);
        localStorage.setItem(`andscene_sandbox_continue_${activeProfile.id}`, JSON.stringify(updated));
        return updated;
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('continue_watching')
        .upsert({
          profile_id: activeProfile.id,
          user_id: user.id,
          media_id: item.id,
          media_type: item.type === 'series' ? 'tv' : 'movie',
          title: item.title,
          poster_path: item.poster,
          progress: progressVal,
          season: item.season || null,
          episode: item.episode || null,
          last_watched: new Date().toISOString(),
        }, {
          onConflict: 'profile_id,media_id'
        });

      if (error) throw error;

      setContinueWatching(prev => {
        const historyItem = { ...item, progress: progressVal };
        const filtered = prev.filter(i => i.id !== item.id);
        return [historyItem, ...filtered].slice(0, 20);
      });
    } catch (err) {
      console.error('Error saving continue watching history', err);
    }
  }, [activeProfile, user]);

  const value = {
    user,
    login,
    signup,
    loginSandbox,
    resendVerificationEmail,
    logout,
    userProfiles,
    createProfile,
    continueWatching,
    addToContinueWatching,
    activeProfile,
    setActiveProfile,
    myList,
    addToMyList,
    removeFromMyList,
    toggleMyList,
    isInMyList,
    modalContent,
    openModal,
    closeModal,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    toast,
    showToast,
    isTMDBSettingsOpen,
    setIsTMDBSettingsOpen,
    // Admin functions
    fetchAllUsers,
    updateUser,
    deleteUser,
    resetUserPassword,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
