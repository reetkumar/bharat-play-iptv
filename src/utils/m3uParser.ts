import { Channel } from '../types';

export function parseM3U(content: string): Channel[] {
  const channels: Channel[] = [];
  const lines = content.split(/\r?\n/);
  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Extract tvg-id
      const tvgIdMatch = line.match(/tvg-id\s*=\s*"([^"]*)"/i);
      if (tvgIdMatch) currentChannel.tvgId = tvgIdMatch[1];

      // Extract tvg-logo (handle malformed entries where attributes lack spaces)
      const logoMatch = line.match(/tvg-logo\s*=\s*"([^"]*)"/i);
      if (logoMatch) currentChannel.logo = logoMatch[1];

      // Extract group-title (category) - handle duplicate/malformed entries
      const groupMatches = line.match(/group-title\s*=\s*"([^"]*)"/gi);
      if (groupMatches && groupMatches.length > 0) {
        const lastGroup = groupMatches[groupMatches.length - 1];
        const groupMatch = lastGroup.match(/group-title\s*=\s*"([^"]*)"/i);
        if (groupMatch) currentChannel.groupTitle = groupMatch[1];
      }

      // Extract channel name (everything after the last comma)
      let name = '';
      const lastCommaIndex = line.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        name = line.substring(lastCommaIndex + 1).trim();
      } else {
        name = 'Unknown Channel';
      }

      // Handle [lang] prefix format (e.g., "[hi] Aaj Tak")
      const langMatch = name.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (langMatch) {
        name = langMatch[2].trim();
        if (!currentChannel.groupTitle) {
          currentChannel.groupTitle = langMatch[1].toUpperCase();
        }
      }

      // Handle ### Category ### format (section headers)
      if (name.startsWith('###') && name.endsWith('###')) {
        const categoryName = name.replace(/^#+\s*/, '').replace(/\s*#+$/, '').trim();
        currentChannel.groupTitle = categoryName;
        currentChannel.isSectionHeader = true;
      } else {
        currentChannel.name = name;
      }
      
      currentChannel.category = currentChannel.groupTitle || 'General';
    } else if (line.startsWith('#EXTGRP:')) {
      currentChannel.category = line.substring(8).trim();
    } else if (line.startsWith('http')) {
      currentChannel.url = line;
      
      // Skip if this is a section header channel (no actual URL)
      if (currentChannel.isSectionHeader) {
        currentChannel = {};
        continue;
      }

      currentChannel.id = Math.random().toString(36).substr(2, 9);
      
      if (currentChannel.url) {
        if (!currentChannel.name) {
          const urlParts = line.split('/');
          currentChannel.name = urlParts[urlParts.length - 1] || 'Unknown Channel';
        }
        channels.push(currentChannel as Channel);
      }
      currentChannel = {};
    }
  }

  return channels;
}

export const INDIAN_CHANNELS_SAMPLE: Channel[] = [
  {
    id: 'test-stream-0',
    name: 'Stable HLS Stream (Tears of Steel)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    category: 'General',
    description: 'A very stable HLS test stream. Use this to verify your player is working correctly. If this plays but others don\'t, the issue is with the specific channel link or CORS restrictions.'
  },
  {
    id: '1',
    name: 'Aaj Tak (Live)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Aaj_Tak_Logo.svg/1200px-Aaj_Tak_Logo.svg.png',
    url: 'https://aajtak-lh.akamaihd.net/i/aajtak_1@407403/master.m3u8',
    category: 'News',
    description: 'Aaj Tak is an Indian Hindi-language news channel owned by TV Today Network. Note: This stream may be geo-restricted or require a VPN in some regions.'
  },
  {
    id: 'test-stream-1',
    name: 'Stable Test Stream (Sintel)',
    logo: 'https://bitmovin.com/wp-content/uploads/2016/04/bitmovin-logo.png',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    category: 'General',
    description: 'A highly stable test stream. Use this to verify your player is working correctly. If this plays but others don\'t, the issue is with the specific channel link or CORS restrictions.'
  },
  {
    id: 'test-stream-2',
    name: 'Big Buck Bunny (4K Test)',
    logo: 'https://peach.blender.org/wp-content/uploads/title_an_small.jpg',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    category: 'General',
    description: 'Another stable HLS test stream. Great for testing high-quality playback and player performance.'
  },
  {
    id: '2',
    name: 'DD News (Live)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/DD_News_Logo.svg/1200px-DD_News_Logo.svg.png',
    url: 'https://ddnews-lh.akamaihd.net/i/ddnews_1@147290/master.m3u8',
    category: 'News',
    description: 'DD News is India\'s only 24-hour terrestrial TV news channel. Note: This is an alternative stable stream.'
  },
  {
    id: '2-alt',
    name: 'India TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/India_TV_logo.svg/1200px-India_TV_logo.svg.png',
    url: 'https://itv-live.akamaized.net/hls/live/2034177/itv/master.m3u8',
    category: 'News',
    description: 'India TV is a popular Hindi news channel. Note: Live streams often change URLs; if this fails, try searching for a fresh M3U8 link.'
  },
  {
    id: '3',
    name: 'Sansad TV (Live)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Sansad_TV_Logo.svg/1200px-Sansad_TV_Logo.svg.png',
    url: 'https://sansad-lh.akamaihd.net/i/sansad_1@322524/master.m3u8',
    category: 'News',
    description: 'Sansad TV is the parliamentary channel of India. It is a highly stable government-run stream.'
  },
  {
    id: '4',
    name: 'News18 India',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/News18_India_logo.svg/1200px-News18_India_logo.svg.png',
    url: 'https://nw18live.akamaized.net/hls/live/2014013/news18india/master.m3u8',
    category: 'News',
    description: 'News18 India is an Indian Hindi-language news channel owned by Network18.'
  }
];
