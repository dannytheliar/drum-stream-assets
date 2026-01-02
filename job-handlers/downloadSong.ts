import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { downloadFromYouTube } from './wrappers/yt-dlp';
import { downloadFromSpotDL } from './wrappers/spotdl';
import { isURL } from '../shared/util';
import { SongDownloadErrorTypes } from '../shared/SongDownloadError';

const spotify = SpotifyApi.withClientCredentials(process.env.SPOTIFY_CLIENT_ID!, process.env.SPOTIFY_CLIENT_SECRET!);

interface SongDownloadOptions {
  maxDuration: number,
  minViews: number,
  allowPlaylists: boolean,
}

export default async function downloadSong(
  query: string,
  outputPath: string,
  options: Partial<SongDownloadOptions> = {}
) {
  try {
    if (isURL(query)) {
      const url = new URL(query);
      const host = url.host.toLowerCase();
      const youTubeMatch = host.match(/^((www|m|music)\.)?(youtube\.com|youtu.be)/);
      const spotifyMatch = host.match(/^(open\.)?spotify\.com/);
      const spotifyShortLinkMatch = host.match(/^spotify(\.app)?\.link/);
      if (youTubeMatch) {
        return [await downloadFromYouTube(url, outputPath, options)];
      } else if (spotifyMatch) {
        if (!url.pathname.includes('/track/') && !options.allowPlaylists) {
          throw new Error('NO_PLAYLISTS');
        }
        if (url.pathname.includes('/album/') && options.allowPlaylists) {
          const albumId = url.pathname.split('/')[2];
          const tracks = await spotify.albums.tracks(albumId);
          const results = [];
          for (const track of tracks.items) {
            console.log('Downloading track', track.track_number, track.name, track.id);
            results.push(
              await downloadFromSpotDL(`https://open.spotify.com/track/${track.id}`, outputPath)
            );
          }
          return results.flat();
        }
      } else if (spotifyShortLinkMatch) {
        const data = await fetch(query);
        const body = await data.text();
        const spotifyId = body.match(/\/track\/([^\s\?\#]+)/)?.[1];
        if (spotifyId) {
          return await downloadFromSpotDL(`https://open.spotify.com/track/${spotifyId}`, outputPath);
        } else {
          throw new Error('UNSUPPORTED_DOMAIN');
        }
      } else {
        throw new Error('UNSUPPORTED_DOMAIN');
      }
    }
    return await downloadFromSpotDL(query, outputPath);
  } catch (err) {
    if (err instanceof Error && SongDownloadErrorTypes.includes(err.message)) throw err;
    throw new Error();
  }
}
