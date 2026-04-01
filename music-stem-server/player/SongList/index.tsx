import { ReactNode, memo, useState } from 'react';
import { formatTime } from '../../../shared/util';
import { SongData, SongRequestData, StreamerbotViewer } from '../../../shared/messages';
import SongListItem from './SongListItem';
import './style.css';

interface SongListProps {
  songs: Array<SongData | SongRequestData>;
  selectedSong?: SongData;
  showTimeAgo?: boolean;
  showRuntime?: boolean;
  renderActions: (song: SongData, index: number) => ReactNode;
  activeViewers?: StreamerbotViewer[];
}

function SongList({ songs, selectedSong, showTimeAgo, showRuntime, renderActions, activeViewers }: SongListProps) {
  const [filter, setFilter] = useState('');
  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(filter.toLowerCase()) ||
    song.artist.toLowerCase().includes(filter.toLowerCase()) ||
    song.album?.toLowerCase().includes(filter.toLowerCase()) ||
    song.requester?.toLowerCase().includes(filter.toLowerCase())
  );

  const totalRuntime = formatTime(filteredSongs.reduce((acc, song) => acc + song.duration, 0), true);
  const remainingRuntime = formatTime(filteredSongs.slice(selectedSong ? filteredSongs.indexOf(selectedSong) : 0).reduce((acc, song) => acc + song.duration, 0), true);
  return (
    <div className="SongList">
      <div className="SongList__filter-container">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.currentTarget.value)}
          placeholder="Search..."
          className="SongList__filter"
        />
        <button onClick={() => setFilter('')}>❌</button>
      </div>
      {showRuntime && <p className="runtime">Runtime: {selectedSong ? `${remainingRuntime} / ${totalRuntime}` : totalRuntime}</p>}
      <ul>
        {filteredSongs.map((song, index) => <SongListItem
          song={song}
          index={index}
          isSelected={selectedSong === song}
          showTimeAgo={showTimeAgo}
          renderActions={renderActions}
          activeViewers={activeViewers}
        />)}
      </ul>
    </div>
  );
}

export default memo(SongList);
