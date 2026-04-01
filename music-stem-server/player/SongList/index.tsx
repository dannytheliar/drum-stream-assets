import { ReactNode, memo } from 'react';
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
  const totalRuntime = formatTime(songs.reduce((acc, song) => acc + song.duration, 0), true);
  const remainingRuntime = formatTime(songs.slice(selectedSong ? songs.indexOf(selectedSong) : 0).reduce((acc, song) => acc + song.duration, 0), true);
  return (
    <div className="SongList">
      {showRuntime && <p className="runtime">Runtime: {selectedSong ? `${remainingRuntime} / ${totalRuntime}` : totalRuntime}</p>}
      <ul>
        {songs.map((song, index) => <SongListItem
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
