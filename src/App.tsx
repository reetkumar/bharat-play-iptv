import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Heart, 
  X,
  Tv,
  Play,
  WifiOff,
} from 'lucide-react';
import { Channel } from './types';
import { parseM3U } from './utils/m3uParser';
import ChannelCard from './components/ChannelCard';
import Player from './components/Player';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';

const DEFAULT_CATEGORIES = ['All', 'News', 'Music', 'Movies', 'Others'];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);

    const savedFavs = localStorage.getItem('favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    const savedRecent = localStorage.getItem('recentChannels');
    if (savedRecent) setRecentChannels(JSON.parse(savedRecent));

    const savedSearchHistory = localStorage.getItem('searchHistory');
    if (savedSearchHistory) setSearchHistory(JSON.parse(savedSearchHistory));

    const loadChannels = async () => {
      try {
        const response = await fetch('https://iptv-org.github.io/iptv/index.m3u');
        if (response.ok) {
          const content = await response.text();
          const parsed = parseM3U(content);
          
          const indianChannels = parsed.filter(channel => {
            const url = channel.url.toLowerCase();
            const name = channel.name.toLowerCase();
            const tvgId = channel.tvgId?.toLowerCase() || '';
            const groupTitle = channel.groupTitle?.toLowerCase() || '';
            
            return (
              url.includes('.in') ||
              name.includes('india') ||
              name.includes('indian') ||
              name.includes('hindi') ||
              name.includes('bollywood') ||
              tvgId.includes('.in') ||
              (groupTitle.includes('india') && !groupTitle.includes('indiana')) ||
              groupTitle.includes('hindi')
            );
          });
          
          setChannels(indianChannels);
          setCategories(DEFAULT_CATEGORIES);
        }
      } catch (e) {
        console.error("Failed to load playlist:", e);
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadChannels();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('recentChannels', JSON.stringify(recentChannels));
  }, [recentChannels]);

  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleFavorite = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleChannelClick = useCallback((channel: Channel) => {
    setCurrentChannel(channel);
    setRecentChannels(prev => {
      const filtered = prev.filter(c => c.id !== channel.id);
      return [channel, ...filtered].slice(0, 10);
    });
  }, []);

  const filteredChannels = React.useMemo(() => {
    let result = channels;
    
    if (activeCategory === 'Favorites') {
      result = channels.filter(c => favorites.includes(c.id));
    } else if (activeCategory === 'Others') {
      const mainCats = ['news', 'music', 'movies'];
      result = channels.filter(c => !mainCats.some(m => c.category.toLowerCase().includes(m)));
    } else if (activeCategory !== 'All') {
      result = channels.filter(c => c.category.toLowerCase().includes(activeCategory.toLowerCase()));
    }
    
    if (searchQuery.trim()) {
      result = result.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [channels, activeCategory, favorites, searchQuery]);

  const handleNextChannel = useCallback(() => {
    if (!currentChannel || filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex(c => c.id === currentChannel.id);
    const nextIndex = currentIndex !== -1 && currentIndex < filteredChannels.length - 1 
      ? currentIndex + 1 
      : 0;
    handleChannelClick(filteredChannels[nextIndex]);
  }, [currentChannel, filteredChannels, handleChannelClick]);

  const handlePreviousChannel = useCallback(() => {
    if (!currentChannel || filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex(c => c.id === currentChannel.id);
    const prevIndex = currentIndex > 0 
      ? currentIndex - 1 
      : filteredChannels.length - 1;
    handleChannelClick(filteredChannels[prevIndex]);
  }, [currentChannel, filteredChannels, handleChannelClick]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
        <AnimatePresence>
          {showSplash && <SplashScreen />}
        </AnimatePresence>

        {isOffline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 bg-yellow-600/90 backdrop-blur-sm z-50 flex items-center justify-center gap-2 py-2 text-sm font-medium"
          >
            <WifiOff size={16} />
            You're offline. Some features may not work.
            <button onClick={() => setIsOffline(false)} className="ml-2 underline">
              Dismiss
            </button>
          </motion.div>
        )}

      {currentChannel && (
        <div className="fixed inset-0 z-50 bg-black">
          <Player 
            channel={currentChannel} 
            onBack={() => setCurrentChannel(null)} 
            onNext={handleNextChannel}
            onPrevious={handlePreviousChannel}
            onChannelSelect={handleChannelClick}
            channelList={filteredChannels}
          />
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 z-30">
        <div className="flex items-center h-16 px-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Tv size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold hidden sm:block">BharatPlay</span>
          </div>

          <div className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  if (query.length >= 2 && !searchHistory.includes(query)) {
                    setSearchHistory(prev => [query, ...prev].slice(0, 5));
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:bg-white/10 transition-all text-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={() => setActiveCategory('Favorites')}
            className={`p-2 rounded-lg transition-colors ${
              activeCategory === 'Favorites' ? 'bg-red-600' : 'hover:bg-white/10'
            }`}
          >
            <Heart size={20} className={activeCategory === 'Favorites' ? 'fill-white' : ''} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-red-600 text-white' 
                : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 px-4 sm:px-6 pb-8">
        {/* Hero Section */}
        {!searchQuery && activeCategory === 'All' && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-48 sm:h-64 rounded-2xl overflow-hidden mb-8 mt-4"
          >
            <img
              src="/177633043.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center brightness-125 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
            <div className="absolute inset-0 flex items-center p-6 sm:p-10">
              <div>
                <span className="inline-block px-3 py-1 bg-red-600 text-xs font-bold rounded-full mb-3">LIVE</span>
                <h1 className="text-2xl sm:text-4xl font-bold mb-2">Live TV Streaming</h1>
                <p className="text-zinc-400 text-sm sm:text-base mb-4">Watch your favorite Indian channels live</p>
                <button 
                  onClick={() => channels[0] && handleChannelClick(channels[0])}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-5 py-2.5 rounded-full font-semibold transition-colors"
                >
                  <Play size={18} fill="currentColor" />
                  Watch Now
                </button>
              </div>
            </div>
          </motion.div>
        )}



        

        {/* Channel Count */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {activeCategory === 'All' ? 'All Channels' : 
             activeCategory === 'Favorites' ? 'My Favorites' : 
             activeCategory}
          </h2>
          <span className="text-sm text-zinc-500">{filteredChannels.length} channels</span>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tv size={48} className="text-zinc-600 mb-4" />
            <p className="text-zinc-400">No channels found</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 text-red-500 hover:text-red-400"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {filteredChannels.map(channel => (
                <ChannelCard 
                  key={channel.id} 
                  channel={channel} 
                  isFavorite={favorites.includes(channel.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={handleChannelClick} 
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}