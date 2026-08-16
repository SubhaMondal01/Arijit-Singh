import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

const VIDEO_ID = "zCYG798Ml4Q";
const SECOND_VIDEO_ID = "zCYG798Ml4Q";
const PROVIDED_LIST_ID = "RDWglSfZJOPds";

const MANUAL_SONGS = [
  {
    id: "00DvaPstcpo",
    title: "LONG DRIVE Bollywood Mix - Arijit Singh ",
    channel: "YouTube",
    thumbnail: "https://i.ytimg.com/vi/00DvaPstcpo/hqdefault.jpg",
  },
];
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function getYouTubeApiUrl(playlistId, pageToken = "") {
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId,
    maxResults: "50",
    key: API_KEY,
  });

  if (pageToken) params.set("pageToken", pageToken);

  return `https://www.googleapis.com/youtube/v3/playlistItems?${params}`;
}

function loadYouTubeIframeApi() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    const oldReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      oldReady?.();
      resolve(window.YT);
    };

    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
  });
}

async function getPlaylistItems(playlistId) {
  if (!API_KEY) {
    throw new Error("Missing VITE_YOUTUBE_API_KEY in .env");
  }

  const items = [];
  let pageToken = "";

  for (let page = 0; page < 4; page += 1) {
    const response = await fetch(getYouTubeApiUrl(playlistId, pageToken));
    const data = await response.json();

    if (!response.ok) {
      const reason =
        data?.error?.errors?.[0]?.reason ||
        data?.error?.message ||
        "YouTube API request failed";
      throw new Error(reason);
    }

    items.push(...(data.items || []));
    pageToken = data.nextPageToken || "";

    if (!pageToken) break;
  }

  return items
    .filter((item) => item.snippet?.resourceId?.videoId)
    .map((item) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      channel:
        item.snippet.videoOwnerChannelTitle ||
        item.snippet.channelTitle ||
        "YouTube",
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${item.snippet.resourceId.videoId}/hqdefault.jpg`,
    }));
}

function App() {
  const playerRef = useRef(null);
  const playerMountRef = useRef(null);
  const timerRef = useRef(null);

  const [songs, setSongs] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeSong = songs[activeIndex];

  // Data API: load playlist items.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        /*
          IMPORTANT:
          RDWglSfZJOPds is a YouTube Radio/Mix identifier from the supplied URL.
          The Data API playlistItems.list endpoint is intended for actual playlist
          IDs and may return playlistOperationUnsupported/notFound for RD mixes.
        */
        const items = await getPlaylistItems(PROVIDED_LIST_ID);

        if (!cancelled) {
          const merged = [...items];

          for (const manualSong of MANUAL_SONGS) {
            if (!merged.some((item) => item.id === manualSong.id)) {
              merged.push(manualSong);
            }
          }

          setSongs(merged);
          setActiveIndex(0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(` "${PROVIDED_LIST_ID}".`);

          setSongs(MANUAL_SONGS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Official YouTube IFrame Player.
  useEffect(() => {
    if (!songs.length) return;

    let cancelled = false;

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !playerMountRef.current) return;

      playerRef.current?.destroy?.();

      playerRef.current = new YT.Player(playerMountRef.current, {
        width: "100%",
        height: "100%",
        videoId: songs[0].id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(volume);
            setDuration(event.target.getDuration());
            setReady(true);
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) setPlaying(true);
            if (event.data === YT.PlayerState.PAUSED) setPlaying(false);

            if (event.data === YT.PlayerState.ENDED) {
              setActiveIndex((old) => (old + 1) % songs.length);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [songs.length]);

  // Change the YouTube video when the selected song changes.
  useEffect(() => {
    if (!ready || !activeSong || !playerRef.current) return;

    playerRef.current.loadVideoById(activeSong.id);
    setCurrent(0);
    setDuration(0);
  }, [activeIndex, ready]);

  // Player progress.
  useEffect(() => {
    clearInterval(timerRef.current);

    if (!playing || !playerRef.current) return;

    timerRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;

      setCurrent(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 500);

    return () => clearInterval(timerRef.current);
  }, [playing]);

  const togglePlay = () => {
    if (!playerRef.current) return;

    if (playing) {
      playerRef.current.pauseVideo();
      setPlaying(false);
    } else {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 70);
      playerRef.current.playVideo();
      setMuted(false);
      setPlaying(true);
    }
  };

  const selectSong = (index) => {
    const song = songs[index];
    setActiveIndex(index);

    if (!playerRef.current || !song) return;

    playerRef.current.unMute();
    playerRef.current.setVolume(volume || 70);
    playerRef.current.loadVideoById(song.id);
    playerRef.current.playVideo();
    setMuted(false);
    setPlaying(true);
  };

  const next = () => {
    if (!songs.length) return;
    const nextIndex = (activeIndex + 1) % songs.length;
    const song = songs[nextIndex];
    setActiveIndex(nextIndex);

    if (playerRef.current && song) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 70);
      playerRef.current.loadVideoById(song.id);
      playerRef.current.playVideo();
      setMuted(false);
      setPlaying(true);
    }
  };

  const previous = () => {
    if (!songs.length) return;
    const previousIndex = (activeIndex - 1 + songs.length) % songs.length;
    const song = songs[previousIndex];
    setActiveIndex(previousIndex);

    if (playerRef.current && song) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 70);
      playerRef.current.loadVideoById(song.id);
      playerRef.current.playVideo();
      setMuted(false);
      setPlaying(true);
    }
  };

  const seek = (event) => {
    const value = Number(event.target.value);
    setCurrent(value);
    playerRef.current?.seekTo?.(value, true);
  };

  const changeVolume = (event) => {
    const value = Number(event.target.value);
    setVolume(value);
    setMuted(value === 0);
    playerRef.current?.unMute?.();
    playerRef.current?.setVolume?.(value);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;

    if (muted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 70);
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  };

  const scrollTo = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[#140d09] text-white">
      {/* Official YouTube player. This remains available as the actual playback surface. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
      >
        <div ref={playerMountRef} className="h-px w-px" />
      </div>

      <section className="hero relative min-h-screen overflow-hidden">
        <header className="relative z-10 flex items-start justify-between gap-3 px-4 py-6 sm:px-7">
          <div className="rounded-full border border-amber-300/50 bg-black/30 px-4 py-2 font-mono text-xs font-bold tracking-[.18em] backdrop-blur-md sm:text-sm">
            11:08 PM
          </div>

          <div className="hidden rounded-full border border-amber-300/50 bg-black/30 px-5 py-2 text-sm font-semibold backdrop-blur-md md:block">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Online 1200
          </div>
        </header>

        <div className="absolute bottom-5 left-1/2 z-20 w-[min(94vw,650px)] -translate-x-1/2 ">
          <div className="glass rounded-[30px] px-4 py-10 sm:px-5">
            {loading ? (
              <div className="py-5 text-center text-sm text-white/60"></div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/20 bg-black/40 sm:h-14 sm:w-14">
                  <img
                    src={
                      activeSong?.thumbnail ||
                      `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-bold">
                    {activeSong?.title || "Dil Karta Hai"}
                  </p>
                  <p className="truncate text-xs text-white/55">
                    {activeSong?.channel || "YouTube"}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="progress"
                      aria-label="Song progress"
                      type="range"
                      min="0"
                      max={duration || 1}
                      value={Math.min(current, duration || 1)}
                      onChange={seek}
                    />
                    <span className="hidden whitespace-nowrap font-mono text-[10px] text-white/55 sm:block">
                      {formatTime(current)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={previous}
                    className="hidden rounded-full p-2 text-white/80 hover:bg-white/10 sm:block"
                    aria-label="Previous"
                  >
                    <SkipBack size={17} fill="currentColor" />
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={!ready}
                    className="grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-xl transition hover:scale-105 disabled:opacity-50"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? (
                      <Pause size={22} fill="currentColor" />
                    ) : (
                      <Play size={22} fill="currentColor" />
                    )}
                  </button>

                  <button
                    onClick={next}
                    className="rounded-full p-2 text-white/80 hover:bg-white/10"
                    aria-label="Next"
                  >
                    <SkipForward size={17} fill="currentColor" />
                  </button>

                  <button
                    onClick={toggleMute}
                    className="hidden rounded-full p-2 text-white/80 hover:bg-white/10 sm:block"
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </button>

                  <input
                    className="hidden w-14 accent-white sm:block"
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="100"
                    value={muted ? 0 : volume}
                    onChange={changeVolume}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => scrollTo("#playlist")}
          className="absolute bottom-3 right-4 z-20 hidden rounded-full border border-white/20 bg-black/25 p-2 text-white/80 backdrop-blur-md sm:block"
          aria-label="View playlist"
        >
          <ChevronDown size={18} />
        </button>
      </section>
    </main>
  );
}

export default App;
