import React from 'react';
import { motion } from 'motion/react';
import { Channel } from '../types';
import { Heart, Play, Radio } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, channelId: string) => void;
  onClick: (channel: Channel) => void;
}

export default function ChannelCard({ channel, isFavorite, onToggleFavorite, onClick }: ChannelCardProps) {
  const [imgError, setImgError] = React.useState(false);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getColor = (name: string) => {
    const colors = [
      'from-red-700 to-red-900',
      'from-blue-700 to-blue-900',
      'from-emerald-700 to-emerald-900',
      'from-amber-600 to-amber-900',
      'from-purple-700 to-purple-900',
      'from-pink-700 to-pink-900',
      'from-cyan-700 to-cyan-900',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(channel)}
      className="relative rounded-2xl overflow-hidden bg-[#141414] cursor-pointer group border border-white/5 hover:border-white/20 transition-all shadow-lg hover:shadow-red-900/20"
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden">
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            onError={() => setImgError(true)}
            onLoad={() => setImgError(false)}
            className="w-full h-full object-contain p-4 bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${getColor(channel.name)}`}>
            <span className="text-3xl font-black text-white/90 tracking-tight">{getInitials(channel.name)}</span>
          </div>
        )}

        {/* Live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <Radio size={9} className="text-white animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-wide">LIVE</span>
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => onToggleFavorite(e, channel.id)}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all z-10 ${
            isFavorite
              ? 'bg-red-500 text-white scale-110'
              : 'bg-black/50 text-white/60 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart size={13} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="w-11 h-11 bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-900/50 group-hover:scale-100 scale-75 transition-transform duration-300"
          >
            <Play size={18} className="text-white ml-0.5" fill="currentColor" />
          </motion.div>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <h3 className="text-sm font-semibold truncate text-white leading-tight">{channel.name}</h3>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{channel.category || 'General'}</p>
      </div>

      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 to-red-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </motion.div>
  );
}
