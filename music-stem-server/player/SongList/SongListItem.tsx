import { memo } from 'react';
import { SongData, SongRequestData, StreamerbotViewer } from '../../../shared/messages';
import { formatTime } from '../../../shared/util';

interface SongListItemProps {
  song: SongData | SongRequestData;
  index: number;
  isSelected?: boolean;
  showTimeAgo?: boolean;
  renderActions: (song: SongData, index: number) => ReactNode;
  activeViewers?: StreamerbotViewer[];
}

const intl = new Intl.RelativeTimeFormat('en');
const getTimeDiff = (ts: string) => {
  const sec = (new Date().getTime() - new Date(ts).getTime()) / 1000;
  if (sec > 60 * 60 * 24) {
    return intl.format(Math.round(-1 * sec / (60 * 60)), 'hours');
  }
  return intl.format(Math.round(-1 * sec / 60), 'minutes');
};

function SongListItem({
  song,
  index,
  isSelected,
  showTimeAgo,
  renderActions,
  activeViewers,
}: SongListItemProps) {
  return (
    <li key={index} className={[
      isSelected ? 'selected' : '',
      song.priority ? `priority priority-${song.priority}` : '',
      song.noShenanigans ? 'no-shens' : '',
      song.status === 'hold' ? 'on-hold' : '',
    ].join(' ')}>
      <div>
        <p className="title">{song.title}</p>
        <p className="artist">{song.artist}</p>
      </div>
      <div>
        <p className="album">{song.album} {song.track ? `- ${song.track}` : ''}</p>
        {song.requester && (
          <p className={`requesterName ${activeViewers?.find(viewer => viewer.display.toLowerCase() === song.requester?.toLowerCase())?.online ? 'online' : 'offline'}`}>
            {song.requester} (#{('fulfilledToday' in song ? song.fulfilledToday || 0 : 0) + 1})
          </p>
        )}
        {showTimeAgo && song.createdAt && <p>{getTimeDiff(song.createdAt)}</p>}
        {showTimeAgo && 'lastFulfilledAt' in song && song.lastFulfilledAt && <p>last song: {getTimeDiff(song.lastFulfilledAt)}</p>}
      </div>
      <div>
        <p className="duration">{formatTime(song.duration)}</p>
      </div>
      <div className="buttons">
        {renderActions(song, index)}
      </div>
    </li>
  );
}

export default memo(SongListItem);
