import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import yaml from 'yaml';
import downloadSong from './downloadSong';
import getSongTags from './getSongTags';
import demucs from './wrappers/demucs';
import getAcoustidRecordingId from './wrappers/acoustid';
import * as Paths from '../shared/paths';
import { Queues, JobInterface } from '../shared/RabbitMQ';

const VIDEO_EXTENSIONS = ['mkv', 'mp4', 'webm'];

const i = new JobInterface();
const cancelledRequests = new Set<number>();

const songifyConfig = yaml.parse(await readFileSync(process.env.SONGIFY_CONFIG_PATH!, 'utf-8'));
const songifyArtistBlacklist = songifyConfig.artistBlacklist as Array<{ id: string, name: string }>;
const bannedArtistNames = new Set(songifyArtistBlacklist.map(a => a.name.toLowerCase()));

await i.listen(Queues.SONG_REQUEST_CREATED, async (msg) => {
  console.log('SONG_REQUEST_CREATED', msg);

  const downloadedSongPaths = await downloadSong(msg.query, Paths.DOWNLOADS_PATH, {
    maxDuration: msg.maxDuration,
    minViews: msg.minViews,
    allowPlaylists: msg.allowPlaylists,
  });

  if (cancelledRequests.has(msg.id)) {
    return;
  }

  for (const index in downloadedSongPaths) {
    const path = downloadedSongPaths[index];
    const tags = await getSongTags(path);

    if (msg.maxDuration && tags.duration > msg.maxDuration) {
      throw new Error('TOO_LONG');
    }

    if (bannedArtistNames.has(String(tags.artist).toLowerCase())) {
      throw new Error('BANNED_ARTIST');
    }

    const acoustidRecordingId = await getAcoustidRecordingId(path);
    let lyricsPath: string | undefined = path.substring(0, path.lastIndexOf('.')) + '.lrc';
    if (!existsSync(lyricsPath)) lyricsPath = undefined;

    await i.publish(Queues.SONG_REQUEST_DOWNLOADED, {
      id: msg.id,
      path,
      ignoreDuplicates: msg.ignoreDuplicates,
      requester: msg.requester,
      acoustidRecordingId,
      lyricsPath: lyricsPath?.replace(Paths.DOWNLOADS_PATH, '').replace(/^[/\\]+/, ''),
      playlistIndex: Number(index),

      artist: String(tags.artist) || '',
      title: String(tags.title) || '',
      album: String(tags.album) || '',
      track: Number(tags.track.no),
      duration: Number(tags.duration),
    });
  }
});

await i.listen(Queues.SONG_REQUEST_DEDUPLICATED, async (msg) => {
  console.log('SONG_REQUEST_DEDUPLICATED', msg);

  const dstPath = msg.path.endsWith('.webm') ? msg.path.replace(/\.webm$/, '.mp4') : msg.path;
  console.log('Running ffmpeg-normalize', msg.path, dstPath);
  execSync(`uv run ffmpeg-normalize "${msg.path}" -o "${dstPath}" -c:a aac -nt rms -t -16 -f`);
  console.log('Running demucs', dstPath);
  const stemsPath = await demucs(dstPath, Paths.DEMUCS_OUTPUT_PATH, msg.ignoreDuplicates);

  const extension = dstPath.substring(dstPath.lastIndexOf('.') + 1);
  const isVideo = VIDEO_EXTENSIONS.includes(extension.toLowerCase());

  if (cancelledRequests.has(msg.id)) {
    return;
  }

  await i.publish(Queues.SONG_REQUEST_COMPLETE, {
    ...msg,
    downloadPath: dstPath.replace(Paths.DOWNLOADS_PATH, '').replace(/^[/\\]+/, ''),
    lyricsPath: msg.lyricsPath?.replace(Paths.DOWNLOADS_PATH, '').replace(/^[/\\]+/, ''),
    stemsPath: stemsPath.replace(Paths.STEMS_PATH, '').replace(/^[/\\]+/, ''),
    isVideo,
    requester: msg.requester,
  });
});

await i.listen(Queues.SONG_REQUEST_CANCELLED, async (msg) => {
  cancelledRequests.add(msg.songRequestId);
});
