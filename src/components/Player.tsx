import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Channel } from '../types';
import { 
  ChevronLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  SkipBack, 
  SkipForward,
  Loader2,
  RotateCcw,
  Settings,
  PictureInPicture,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PlayerProps {
  channel: Channel;
  onBack: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onChannelSelect?: (channel: Channel) => void;
  channelList?: Channel[];
}

interface QualityLevel {
  height: number;
  bitrate: number;
  index: number;
  label: string;
}

export default function Player({ channel, onBack, onNext, onPrevious, onChannelSelect, channelList = [] }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [isPip, setIsPip] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const proxyUrl = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`;

  const handleBackClick = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    onBack();
  }, [onBack]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => setIsMuted(m => !m), []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  }, []);

  const handleQualityChange = useCallback((qualityIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityIndex;
      setCurrentQuality(qualityIndex);
    }
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetControlsTimer();
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          togglePlay();
          break;
        case 'Escape':
          handleBackClick();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(v => Math.min(v + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(v => Math.max(v - 0.1, 0));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= 10;
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += 10;
          break;
        case 'f':
        case 'F':
          toggleFullScreen();
          break;
        case 'n':
        case 'N':
          onNext?.();
          break;
        case 'p':
        case 'P':
          onPrevious?.();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBackClick, togglePlay, toggleMute, toggleFullScreen, resetControlsTimer, onNext, onPrevious]);

  // HLS setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setBuffering(true);
    setError(null);
    setQualityLevels([]);
    setCurrentQuality(-1);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = channel.url;
    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('.m3u');

    // Timeout: if nothing happens in 15s, show error
    const loadTimeout = setTimeout(() => {
      setIsLoading(false);
      setError('Stream timed out. The channel may be offline or geo-restricted.');
    }, 15000);

    const clearLoadTimeout = () => clearTimeout(loadTimeout);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
      });

      // Proxy the manifest URL directly
      hls.loadSource(proxyUrl(streamUrl));
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearLoadTimeout();
        setIsLoading(false);
        const levels = hls.levels
          .map((level, index) => ({
            height: level.height,
            bitrate: level.bitrate,
            index,
            label: level.name || `${level.height}p`,
          }))
          .filter(l => l.height > 0);
        if (levels.length > 0) {
          setQualityLevels([{ height: 0, bitrate: 0, index: -1, label: 'Auto' }, ...levels]);
        }
        video.play().catch(() => {});
      });

      let networkRetries = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          clearLoadTimeout();
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
            networkRetries++;
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
            hlsRef.current = null;
            setError('Stream failed to load. The channel may be offline or geo-restricted.');
            setIsLoading(false);
          }
        }
      });

      hlsRef.current = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari) — proxy the initial URL
      video.src = proxyUrl(streamUrl);
      video.onloadedmetadata = () => { clearLoadTimeout(); setIsLoading(false); };
      video.onerror = () => { clearLoadTimeout(); setError('Stream failed to load.'); setIsLoading(false); };
    } else {
      video.src = proxyUrl(streamUrl);
      video.onloadedmetadata = () => { clearLoadTimeout(); setIsLoading(false); };
      video.onerror = () => {
        clearLoadTimeout();
        setError('Unable to play this stream. The format may not be supported.');
        setIsLoading(false);
      };
    }

    return () => {
      clearLoadTimeout();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.url, retryCount]);

  // Sync volume/mute to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  // PiP events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPip(true);
    const onLeave = () => setIsPip(false);
    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setBuffering(true);
    setError(null);
    setRetryCount(c => c + 1);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        crossOrigin="anonymous"
        onClick={togglePlay}
        onDoubleClick={toggleFullScreen}
        onPlay={() => { setIsPlaying(true); setBuffering(false); }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => { setIsLoading(false); setBuffering(false); }}
        onError={() => {
          setError('Video playback error. Please try another stream.');
          setIsLoading(false);
        }}
      />

      {/* Initial loading */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={48} className="text-red-500 animate-spin" />
            <p className="text-white/80 text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Buffering indicator */}
      {buffering && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
          <Loader2 size={32} className="text-white animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-40">
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <Play size={36} className="text-red-500 ml-1" />
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Playback Error</h3>
            <p className="text-zinc-400 mb-8">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleBackClick}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-full transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleRetry}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-colors flex items-center gap-2"
              >
                <RotateCcw size={18} />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between z-20 pointer-events-none"
          >
            {/* Top gradient */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

            {/* Top bar */}
            <div className="flex items-center justify-between px-4 pt-4 pointer-events-auto">
              <button
                onClick={handleBackClick}
                className="p-3 rounded-full hover:bg-white/10 transition-colors text-white"
              >
                <ChevronLeft size={28} />
              </button>

              <div className="flex-1 mx-4 text-center">
                <h2 className="text-white font-semibold text-lg truncate drop-shadow-lg">{channel.name}</h2>
                <p className="text-white/60 text-sm truncate">{channel.category}</p>
              </div>

              <div className="flex items-center gap-1 pointer-events-auto">
                {document.pictureInPictureEnabled && (
                  <button
                    onClick={togglePip}
                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isPip ? 'text-red-400' : 'text-white/70 hover:text-white'}`}
                    title="Picture in Picture"
                  >
                    <PictureInPicture size={18} />
                  </button>
                )}
                {channelList.length > 0 && (
                  <button
                    onClick={() => setShowChannelList(v => !v)}
                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${showChannelList ? 'text-red-400' : 'text-white/70 hover:text-white'}`}
                    title="Channel List"
                  >
                    <List size={18} />
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(v => !v)}
                  disabled={qualityLevels.length === 0}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-30"
                  title="Quality"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isPlaying && !isLoading && (
                <button
                  onClick={togglePlay}
                  className="p-5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 pointer-events-auto"
                >
                  <Play size={48} className="text-white fill-white ml-1" />
                </button>
              )}
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-between px-4 pb-6 pointer-events-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={onPrevious}
                  disabled={!onPrevious}
                  className="p-2 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <SkipBack size={22} />
                </button>

                <button
                  onClick={togglePlay}
                  className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white hover:scale-105 transition-all"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </button>

                <button
                  onClick={onNext}
                  disabled={!onNext}
                  className="p-2 text-white/70 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <SkipForward size={22} />
                </button>

                <div className="flex items-center gap-2 ml-2">
                  <button onClick={toggleMute} className="text-white/70 hover:text-white p-1">
                    {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>

              <button
                onClick={toggleFullScreen}
                className="p-2 text-white/70 hover:text-white transition-colors"
                title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>

            {/* Quality settings popup */}
            {showSettings && qualityLevels.length > 0 && (
              <div className="absolute bottom-20 right-4 bg-black/90 backdrop-blur-md rounded-xl p-3 z-30 min-w-[140px] pointer-events-auto">
                <p className="text-xs text-zinc-500 mb-2 px-2">Quality</p>
                {qualityLevels.map((q) => (
                  <button
                    key={q.index}
                    onClick={() => { handleQualityChange(q.index); setShowSettings(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentQuality === q.index || (currentQuality === -1 && q.index === -1)
                        ? 'bg-red-600 text-white'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Channel list sidebar */}
      <AnimatePresence>
        {showChannelList && channelList.length > 0 && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 w-72 bg-black/95 backdrop-blur-md z-30 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">Channels</h3>
              <button
                onClick={() => setShowChannelList(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {channelList.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    onChannelSelect?.(ch);
                    setShowChannelList(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    ch.id === channel.id
                      ? 'bg-red-600 text-white'
                      : 'text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <p className="truncate">{ch.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{ch.category}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
