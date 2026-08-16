import { useEffect, useRef, useState } from "react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Moon,
  Sun,
} from "lucide-react";

/* =========================================================
   SONGS
========================================================= */

const SONGS = [
  {
    id: "00DvaPstcpo",
    title: "LONG DRIVE Bollywood Mix - Arijit Singh",
    channel: "YouTube",
    thumbnail: "https://i.ytimg.com/vi/00DvaPstcpo/hqdefault.jpg",
  },

  {
    id: "zCYG798Ml4Q",
    title: "Arijit Singh",
    channel: "YouTube",
    thumbnail: "https://i.ytimg.com/vi/zCYG798Ml4Q/hqdefault.jpg",
  },
];

/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);

  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secs}`;
}

/* =========================================================
   LOAD YOUTUBE IFRAME API
========================================================= */

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const oldReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      oldReady?.();
      resolve(window.YT);
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement("script");

      script.src = "https://www.youtube.com/iframe_api";

      document.body.appendChild(script);
    }
  });
}

/* =========================================================
   BACKGROUND MUSIC
========================================================= */

export default function BackgroundMusic() {
  const playerRef = useRef(null);
  const playerMountRef = useRef(null);
  const timerRef = useRef(null);

  /* =======================================================
     STATE
  ======================================================= */

  const [currentSong, setCurrentSong] = useState(0);

  const [ready, setReady] = useState(false);

  const [playing, setPlaying] = useState(false);

  const [muted, setMuted] = useState(false);

  const [volume, setVolume] = useState(70);

  const [currentTime, setCurrentTime] = useState(0);

  const [duration, setDuration] = useState(0);

  /*
    NEW:
    Screen Off / Black Screen mode
  */

  const [screenOff, setScreenOff] = useState(false);

  const song = SONGS[currentSong];

  /* =========================================================
     CREATE YOUTUBE PLAYER
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    loadYouTubeAPI().then((YT) => {
      if (cancelled || !playerMountRef.current) {
        return;
      }

      playerRef.current?.destroy?.();

      playerRef.current = new YT.Player(playerMountRef.current, {
        width: "100%",
        height: "100%",

        videoId: SONGS[0].id,

        playerVars: {
          autoplay: 0,
          controls: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },

        events: {
          /* =============================================
               READY
            ============================================= */

          onReady: (event) => {
            event.target.setVolume(70);

            setDuration(event.target.getDuration());

            setReady(true);
          },

          /* =============================================
               PLAYER STATE
            ============================================= */

          onStateChange: (event) => {
            /*
                PLAYING
              */

            if (event.data === YT.PlayerState.PLAYING) {
              setPlaying(true);
            }

            /*
                PAUSED
              */

            if (event.data === YT.PlayerState.PAUSED) {
              setPlaying(false);
            }

            /*
                ENDED
              */

            if (event.data === YT.PlayerState.ENDED) {
              setCurrentSong((old) => {
                return (old + 1) % SONGS.length;
              });
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
  }, []);

  /* =========================================================
     CHANGE SONG
  ========================================================= */

  useEffect(() => {
    if (!ready) return;

    if (!playerRef.current) return;

    const player = playerRef.current;

    player.loadVideoById(SONGS[currentSong].id);

    setCurrentTime(0);

    setDuration(0);

    /*
      Automatically play the new song.
    */

    setTimeout(() => {
      player.unMute();

      player.setVolume(volume || 70);

      player.playVideo();

      setMuted(false);

      setPlaying(true);
    }, 200);
  }, [currentSong]);

  /* =========================================================
     PROGRESS
  ========================================================= */

  useEffect(() => {
    clearInterval(timerRef.current);

    if (!playing) {
      return;
    }

    timerRef.current = setInterval(() => {
      const player = playerRef.current;

      if (!player?.getCurrentTime) {
        return;
      }

      setCurrentTime(player.getCurrentTime());

      setDuration(player.getDuration());
    }, 500);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [playing]);

  /* =========================================================
     PLAY
  ========================================================= */

  const playMusic = () => {
    if (!playerRef.current || !ready) {
      return;
    }

    playerRef.current.unMute();

    playerRef.current.setVolume(volume || 70);

    playerRef.current.playVideo();

    setMuted(false);

    setPlaying(true);
  };

  /* =========================================================
     PLAY / PAUSE
  ========================================================= */

  const togglePlay = () => {
    if (!playerRef.current || !ready) {
      return;
    }

    if (playing) {
      playerRef.current.pauseVideo();

      setPlaying(false);
    } else {
      playMusic();
    }
  };

  /* =========================================================
     NEXT SONG
  ========================================================= */

  const nextSong = () => {
    const next = (currentSong + 1) % SONGS.length;

    setCurrentSong(next);
  };

  /* =========================================================
     PREVIOUS SONG
  ========================================================= */

  const previousSong = () => {
    const previous = (currentSong - 1 + SONGS.length) % SONGS.length;

    setCurrentSong(previous);
  };

  /* =========================================================
     SEEK
  ========================================================= */

  const seek = (event) => {
    const value = Number(event.target.value);

    setCurrentTime(value);

    playerRef.current?.seekTo?.(value, true);
  };

  /* =========================================================
     VOLUME
  ========================================================= */

  const changeVolume = (event) => {
    const value = Number(event.target.value);

    setVolume(value);

    setMuted(value === 0);

    playerRef.current?.unMute?.();

    playerRef.current?.setVolume?.(value);
  };

  /* =========================================================
     MUTE
  ========================================================= */

  const toggleMute = () => {
    if (!playerRef.current) {
      return;
    }

    if (muted) {
      playerRef.current.unMute();

      playerRef.current.setVolume(volume || 70);

      setMuted(false);
    } else {
      playerRef.current.mute();

      setMuted(true);
    }
  };

  /* =========================================================
     SCREEN OFF MODE
  ========================================================= */

  const toggleScreenOff = () => {
    setScreenOff((previous) => {
      return !previous;
    });
  };

  /* =========================================================
     SCREEN OFF MODE
  ========================================================= */

  if (screenOff) {
    return (
      <div
        onClick={toggleScreenOff}
        className="
          fixed
          inset-0
          z-[99999]
          flex
          cursor-pointer
          items-center
          justify-center
          bg-black
          text-white
        "
        aria-label="Screen off mode. Tap to return."
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              mb-5
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-full
              border
              border-white/10
              bg-white/5
            "
          >
            <Moon size={28} className="text-white/40" />
          </div>

          <p className="text-sm text-white/40">Screen Off Mode</p>

          <p className="mt-2 text-xs text-white/20">Tap anywhere to return</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <>
      {/* =====================================================
          HIDDEN YOUTUBE PLAYER
      ===================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          fixed
          -left-[9999px]
          top-0
          h-px
          w-px
          overflow-hidden
          opacity-0
        "
      >
        <div ref={playerMountRef} className="h-px w-px" />
      </div>

      {/* =====================================================
          MUSIC PLAYER
      ===================================================== */}

      <div
        className="
          fixed
          bottom-5
          left-1/2
          z-[9999]
          w-[94vw]
          max-w-[650px]
          -translate-x-1/2
        "
      >
        <div
          className="
            rounded-[30px]
            border
            border-white/10
            bg-black/75
            p-4
            shadow-2xl
            backdrop-blur-xl
          "
        >
          <div className="flex items-center gap-2 sm:gap-3">
            {/* =================================================
                THUMBNAIL
            ================================================= */}

            <div
              className="
                h-11
                w-11
                shrink-0
                overflow-hidden
                rounded-full
                border
                border-white/20
                bg-black

                sm:h-14
                sm:w-14
              "
            >
              <img
                src={song.thumbnail}
                alt={song.title}
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            </div>

            {/* =================================================
                SONG INFO
            ================================================= */}

            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate
                  text-xs
                  font-bold

                  sm:text-sm
                "
              >
                {song.title}
              </p>

              <p
                className="
                  truncate
                  text-[10px]
                  text-white/50

                  sm:text-xs
                "
              >
                {song.channel}
              </p>

              {/* Progress */}

              <div
                className="
                  mt-1
                  flex
                  items-center
                  gap-2

                  sm:mt-2
                "
              >
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  value={Math.min(currentTime, duration || 1)}
                  onChange={seek}
                  aria-label="Song progress"
                  className="
                    h-1
                    w-full
                    cursor-pointer
                    accent-white
                  "
                />

                <span
                  className="
                    hidden
                    whitespace-nowrap
                    font-mono
                    text-[10px]
                    text-white/50

                    sm:block
                  "
                >
                  {formatTime(currentTime)}
                  {" / "}
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* =================================================
                CONTROLS
            ================================================= */}

            <div
              className="
                flex
                shrink-0
                items-center
                gap-0

                sm:gap-1
              "
            >
              {/* PREVIOUS */}

              <button
                onClick={previousSong}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  text-white/80
                  transition
                  hover:bg-white/10

                  sm:h-9
                  sm:w-9
                "
                aria-label="Previous song"
              >
                <SkipBack size={15} fill="currentColor" />
              </button>

              {/* PLAY / PAUSE */}

              <button
                onClick={togglePlay}
                disabled={!ready}
                className="
                  grid
                  h-12
                  w-12
                  shrink-0
                  place-items-center
                  rounded-full
                  bg-white
                  text-black
                  shadow-xl
                  transition
                  hover:scale-105
                  disabled:opacity-50

                  sm:h-14
                  sm:w-14
                "
                aria-label={playing ? "Pause music" : "Play music"}
              >
                {playing ? (
                  <Pause size={20} fill="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" />
                )}
              </button>

              {/* NEXT */}

              <button
                onClick={nextSong}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  text-white/80
                  transition
                  hover:bg-white/10

                  sm:h-9
                  sm:w-9
                "
                aria-label="Next song"
              >
                <SkipForward size={15} fill="currentColor" />
              </button>

              {/* MUTE */}

              <button
                onClick={toggleMute}
                className="
                  hidden
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  text-white/80
                  hover:bg-white/10

                  sm:flex
                "
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>

              {/* VOLUME */}

              <input
                type="range"
                min="0"
                max="100"
                value={muted ? 0 : volume}
                onChange={changeVolume}
                aria-label="Volume"
                className="
                  hidden
                  w-14
                  accent-white

                  sm:block
                "
              />

              {/* =================================================
                  SCREEN OFF BUTTON
              ================================================= */}

              <button
                onClick={toggleScreenOff}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  text-white/70
                  transition
                  hover:bg-white/10
                  hover:text-white

                  sm:h-9
                  sm:w-9
                "
                aria-label="Screen off mode"
                title="Screen Off"
              >
                <Moon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
