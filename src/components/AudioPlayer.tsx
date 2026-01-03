import { useEffect, useRef, forwardRef } from "react";

export default forwardRef<HTMLAudioElement, {
    audioUrl: string;
    mimeType: string;
    onTimeUpdate?: (currentTime: number) => void;
}>(function AudioPlayer(props, ref) {
    const audioSource = useRef<HTMLSourceElement>(null);

    // Updates src when url changes
    useEffect(() => {
        const audio = (ref as React.RefObject<HTMLAudioElement>)?.current;
        if (audio && audioSource.current) {
            audioSource.current.src = props.audioUrl;
            audio.load();
        }
    }, [props.audioUrl, ref]);

    return (
        <div className='flex relative z-10 p-4 w-full'>
            <audio
                ref={ref}
                controls
                className='w-full h-14 rounded-lg bg-white shadow-xl shadow-black/5 ring-1 ring-slate-700/10'
                onTimeUpdate={(e) => props.onTimeUpdate?.((e.target as HTMLAudioElement).currentTime)}
            >
                <source ref={audioSource} type={props.mimeType}></source>
            </audio>
        </div>
    );
});
