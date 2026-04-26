/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Program {
  title: string;
  start: string;
  end: string;
  description?: string;
}

export interface EPGChannel {
  id: string;
  programs: Program[];
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  description?: string;
  language?: string;
  tvgId?: string;
  groupTitle?: string;
  currentProgram?: Program;
  nextProgram?: Program;
  isSectionHeader?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  channels: Channel[];
  lastUpdated: number;
}

export interface PlaybackState {
  currentChannel: Channel | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isFullScreen: boolean;
}

export type Category = 'All' | 'News' | 'Sports' | 'Entertainment' | 'Movies' | 'Regional' | 'Favorites' | 'General';
