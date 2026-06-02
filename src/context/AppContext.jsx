/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';


const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activeProfile, setActiveProfile] = useState(null);
  
  // Load My List from localStorage on init
  const [myList, setMyList] = useState(() => {
    const saved = localStorage.getItem('netflix_my_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Save My List whenever it changes
  useEffect(() => {
    localStorage.setItem('netflix_my_list', JSON.stringify(myList));
  }, [myList]);

  const [modalContent, setModalContent] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const addToMyList = useCallback((item) => {
    setMyList(prev => {
      if (prev.find(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
    showToast(`Added "${item.title}" to My List`);
  }, [showToast]);

  const removeFromMyList = useCallback((itemId) => {
    const item = myList.find(i => i.id === itemId);
    setMyList(prev => prev.filter(i => i.id !== itemId));
    if (item) showToast(`Removed "${item.title}" from My List`);
  }, [myList, showToast]);

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

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('netflix_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [continueWatching, setContinueWatching] = useState(() => {
    const saved = localStorage.getItem('netflix_continue_watching');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('netflix_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('netflix_continue_watching', JSON.stringify(continueWatching));
  }, [continueWatching]);

  const login = useCallback((email) => {
    setUser({ email, id: Date.now() });
    showToast(`Logged in as ${email}`);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setMyList([]);
    setContinueWatching([]);
    setActiveProfile(null);
    showToast('Logged out successfully');
  }, []);

  const addToContinueWatching = useCallback((item) => {
    setContinueWatching(prev => {
      // Add progress property
      const historyItem = { ...item, progress: Math.floor(Math.random() * 80) + 10 }; // Mock progress percentage
      const filtered = prev.filter(i => i.id !== item.id);
      return [historyItem, ...filtered].slice(0, 20); // Keep last 20
    });
  }, []);

  const value = {
    user,
    login,
    logout,
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
