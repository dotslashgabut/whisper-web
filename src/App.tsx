import { useState, useEffect, useRef, useCallback } from "react";
import { AudioManager } from "./components/AudioManager";
import Transcript from "./components/Transcript";
import { useTranscriber } from "./hooks/useTranscriber";

function App() {
    const transcriber = useTranscriber();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);

    // Dark Mode State
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const handleTimeStampClick = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            audioRef.current.play();
        }
    };

    const handleTimeUpdate = useCallback((time: number) => {
        setCurrentTime(time);
    }, []);

    return (
        <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-github-bg dark:text-github-text'>
            {/* Dark mode toggle */}
            <div className='fixed top-4 right-4 z-[60]'>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-white dark:bg-github-secondary shadow-md text-slate-700 dark:text-github-text hover:bg-slate-100 dark:hover:bg-github-border border border-transparent dark:border-github-border"
                    aria-label="Toggle Dark Mode"
                >
                    {theme === 'dark' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                    )}
                </button>
            </div>

            <div className='container mx-auto flex flex-col justify-center items-center flex-1 max-w-4xl w-full px-4 pt-4 pb-4'>
                {/* Static header - no shrink animation to prevent flickering */}
                <div className='w-full flex flex-col items-center py-6 mb-5'>
                    <h1 className='font-extrabold tracking-tight text-slate-900 dark:text-white text-center text-4xl sm:text-5xl md:text-7xl'>
                        Whisper Web
                    </h1>
                    <h2 className='px-4 text-center font-semibold tracking-tight text-slate-900 dark:text-github-muted mt-3 text-sm sm:text-xl md:text-2xl'>
                        ML-powered speech recognition directly in your browser
                    </h2>
                </div>

                {/* Full width container for AudioManager (includes controls, player, and transcribe button) */}
                <div className='sticky top-0 z-50 w-full py-3 mb-4 bg-slate-50 dark:bg-github-bg border-b border-slate-200/50 dark:border-github-border/50'>
                    <AudioManager transcriber={transcriber} audioRef={audioRef} onTimeUpdate={handleTimeUpdate} />
                </div>

                <Transcript
                    transcribedData={transcriber.output}
                    sourceName={transcriber.sourceName}
                    onTimeStampClick={handleTimeStampClick}
                    currentAudioTime={currentTime}
                />
            </div>

            <div className='sticky bottom-0 w-full text-center py-2 text-sm text-slate-500 bg-slate-50/90 border-t border-slate-200/50 dark:border-github-border/50 dark:bg-github-bg/90 dark:text-github-muted backdrop-blur-md z-50'>
                Made with{" "}
                <a
                    className='underline hover:text-slate-800 dark:hover:text-github-text'
                    href='https://github.com/xenova/transformers.js'
                >
                    🤗 Transformers.js
                </a>
            </div>
        </div>
    );
}

export default App;
