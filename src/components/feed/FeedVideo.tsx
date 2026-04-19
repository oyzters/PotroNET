import { useRef, useState, useEffect, useCallback } from 'react';
import { useInView } from '@/hooks/useInView';
import { PauseIcon, PlayIcon, Volume2Icon, VolumeXIcon, MaximizeIcon } from 'lucide-react';

interface FeedVideoProps {
    src: string;
    className?: string;
    onError?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}

export function FeedVideo({ src, className, onError }: FeedVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [containerRef, inView] = useInView<HTMLDivElement>({ threshold: 0.5 });

    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(false);

    // Direct DOM refs for smooth RAF-driven progress (no React re-render per frame)
    const progressFillRef = useRef<HTMLDivElement>(null);
    const progressThumbRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef(0); // current 0-1 value
    const rafRef = useRef<number | null>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // RAF loop — updates progress bar via direct DOM, not React state
    const startRaf = useCallback(() => {
        const tick = () => {
            const video = videoRef.current;
            if (video && video.duration && !isDraggingRef.current) {
                const p = video.currentTime / video.duration;
                progressRef.current = p;
                const pct = `${p * 100}%`;
                if (progressFillRef.current) progressFillRef.current.style.width = pct;
                if (progressThumbRef.current) progressThumbRef.current.style.left = pct;
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    const stopRaf = useCallback(() => {
        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    useEffect(() => () => stopRaf(), [stopRaf]);

    // Autoplay when in view — tries with audio first, falls back to muted
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (inView) {
            video.muted = false;
            video.play()
                .then(() => { setPlaying(true); setMuted(false); startRaf(); })
                .catch(() => {
                    video.muted = true;
                    setMuted(true);
                    video.play()
                        .then(() => { setPlaying(true); startRaf(); })
                        .catch(() => {});
                });
        } else {
            video.pause();
            setPlaying(false);
            stopRaf();
        }
    }, [inView, startRaf, stopRaf]);

    const revealControls = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!isDraggingRef.current) setShowControls(false);
        }, 3000);
    }, []);

    const togglePlay = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (playing) {
            video.pause();
            stopRaf();
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        } else {
            video.play().then(() => { setPlaying(true); startRaf(); }).catch(() => {});
            revealControls();
        }
    }, [playing, startRaf, stopRaf, revealControls]);

    const seekTo = (clientX: number) => {
        const bar = progressBarRef.current;
        const video = videoRef.current;
        if (!bar || !video) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        video.currentTime = ratio * video.duration;
        progressRef.current = ratio;
        const pct = `${ratio * 100}%`;
        if (progressFillRef.current) progressFillRef.current.style.width = pct;
        if (progressThumbRef.current) progressThumbRef.current.style.left = pct;
        setCurrentTime(ratio * video.duration);
    };

    const handleProgressMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        isDraggingRef.current = true;
        seekTo(e.clientX);
        const onMove = (ev: MouseEvent) => seekTo(ev.clientX);
        const onUp = () => {
            isDraggingRef.current = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        const newMuted = !muted;
        video.muted = newMuted;
        if (!newMuted && volume === 0) { video.volume = 1; setVolume(1); }
        setMuted(newMuted);
        revealControls();
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        const val = parseFloat(e.target.value);
        video.volume = val;
        video.muted = val === 0;
        setVolume(val);
        setMuted(val === 0);
        revealControls();
    };

    const handleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if ((video as any).webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
        }
    };

    const fmt = (s: number) =>
        `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const controlsVisible = showControls || !playing;

    return (
        <div
            ref={containerRef}
            className={`relative bg-black select-none overflow-hidden ${className ?? ''}`}
            onClick={() => { togglePlay(); revealControls(); }}
            onMouseMove={revealControls}
            onTouchStart={revealControls}
        >
            <video
                ref={videoRef}
                src={src}
                playsInline
                loop
                preload="metadata"
                className="w-full max-h-[450px] object-contain"
                onLoadedMetadata={e => {
                    const v = e.target as HTMLVideoElement;
                    setDuration(v.duration);
                    setVolume(v.volume);
                }}
                onTimeUpdate={e => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                onPlay={() => { setPlaying(true); startRaf(); }}
                onPause={() => { setPlaying(false); stopRaf(); }}
                onError={onError}
            />

            {/* Bottom gradient */}
            <div className={`absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`} />

            {/* Center play icon when paused */}
            {!playing && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                        <PlayIcon className="h-7 w-7 fill-white text-white ml-1" />
                    </div>
                </div>
            )}

            {/* Controls */}
            <div
                className={`absolute inset-x-0 bottom-0 px-3 pb-3 pt-6 flex flex-col gap-2.5 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Progress bar */}
                <div
                    ref={progressBarRef}
                    className="relative w-full h-[3px] bg-white/30 rounded-full cursor-pointer group/bar"
                    onMouseDown={handleProgressMouseDown}
                    onTouchStart={e => { e.stopPropagation(); isDraggingRef.current = true; seekTo(e.touches[0].clientX); }}
                    onTouchMove={e => { seekTo(e.touches[0].clientX); revealControls(); }}
                    onTouchEnd={() => { isDraggingRef.current = false; }}
                    onClick={e => { e.stopPropagation(); seekTo(e.clientX); }}
                >
                    <div ref={progressFillRef} className="h-full bg-white rounded-full" style={{ width: '0%' }} />
                    <div
                        ref={progressThumbRef}
                        className="absolute top-1/2 h-3.5 w-3.5 bg-white rounded-full shadow-md -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                        style={{ left: '0%' }}
                    />
                </div>

                {/* Buttons row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Play / Pause */}
                        <button className="text-white hover:scale-110 active:scale-90 transition-transform" onClick={togglePlay}>
                            {playing
                                ? <PauseIcon className="h-5 w-5 fill-white" />
                                : <PlayIcon className="h-5 w-5 fill-white ml-0.5" />}
                        </button>

                        {/* Mute / Unmute */}
                        <button className="text-white hover:scale-110 active:scale-90 transition-transform" onClick={toggleMute}>
                            {muted ? <VolumeXIcon className="h-5 w-5" /> : <Volume2Icon className="h-5 w-5" />}
                        </button>

                        {/* Volume slider — desktop only */}
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={muted ? 0 : volume}
                            onChange={handleVolumeChange}
                            onClick={e => e.stopPropagation()}
                            className="hidden md:block w-16 h-[3px] cursor-pointer rounded-full"
                            style={{ accentColor: 'white' }}
                        />

                        {/* Time */}
                        <span className="text-white/75 text-[11px] tabular-nums leading-none">
                            {fmt(currentTime)} / {fmt(duration)}
                        </span>
                    </div>

                    {/* Fullscreen */}
                    <button className="text-white hover:scale-110 active:scale-90 transition-transform" onClick={handleFullscreen}>
                        <MaximizeIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
