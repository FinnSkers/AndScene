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

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Listen for Auth changes & fetch active session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ email: session.user.email, id: session.user.id });
      } else {
        setUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email, id: session.user.id });
      } else {
        setUser(null);
        setActiveProfile(null);
        setUserProfiles([]);
        setMyList([]);
        setContinueWatching([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profiles when user is loaded
  const fetchProfiles = useCallback(async (userId) => {
    if (!userId) return;
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
  }, []);

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
    try {
      const randomSeed = Math.floor(Math.random() * 1000);
      const avatarUrl = `https://picsum.photos/seed/prof${randomSeed}/200/200`;

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
  }, [activeProfile]);

  // Sync Continue Watching when activeProfile changes
  useEffect(() => {
    const loadContinueWatching = async () => {
      if (!activeProfile?.id) {
        setContinueWatching([]);
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
        }));
        setContinueWatching(mappedList);
      } catch (err) {
        console.error('Error loading continue watching history', err);
      }
    };

    loadContinueWatching();
  }, [activeProfile]);

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
        showToast('Logged in successfully!');
        setUser({ email: data.user.email, id: data.user.id });
        return data.user;
      }
    } catch (err) {
      console.error('Auth error', err);
      throw err;
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
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

  const addToMyList = useCallback(async (item) => {
    if (!activeProfile?.id || !user?.id) {
      setMyList(prev => {
        if (prev.find(i => i.id === item.id)) return prev;
        return [...prev, item];
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
  }, [activeProfile, myList, showToast]);

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
