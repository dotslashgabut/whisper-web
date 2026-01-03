import { useRef, useEffect } from "react";

import { TranscriberData } from "../hooks/useTranscriber";
import { formatAudioTimestamp } from "../utils/AudioUtils";

interface Props {
    transcribedData: TranscriberData | undefined;
    sourceName?: string;
    onTimeStampClick?: (time: number) => void;
    currentAudioTime?: number;
}

export default function Transcript({ transcribedData, sourceName, onTimeStampClick, currentAudioTime }: Props) {
    const divRef = useRef<HTMLDivElement>(null);
    const activeRowRef = useRef<HTMLDivElement>(null);

    const getBaseFilename = () => {
        if (!sourceName) return "transcript";
        return sourceName.replace(/\.[^/.]+$/, "");
    };

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };
    const exportTXT = () => {
        let chunks = transcribedData?.chunks ?? [];
        let text = chunks
            .map((chunk) => chunk.text)
            .join("")
            .trim();

        const blob = new Blob([text], { type: "text/plain" });
        saveBlob(blob, `${getBaseFilename()}.txt`);
    };
    const exportJSON = () => {
        let jsonData = JSON.stringify(transcribedData?.chunks ?? [], null, 2);

        // post-process the JSON to make it more readable
        const regex = /(    "timestamp": )\[\s+(\S+)\s+(\S+)\s+\]/gm;
        jsonData = jsonData.replace(regex, "$1[$2 $3]");

        const blob = new Blob([jsonData], { type: "application/json" });
        saveBlob(blob, `${getBaseFilename()}.json`);
    };

    const exportLRC = () => {
        let chunks = transcribedData?.chunks ?? [];
        let lrcContent = "";

        chunks.forEach((chunk) => {
            const startTime = chunk.timestamp[0];
            const minutes = Math.floor(startTime / 60);
            const seconds = Math.floor(startTime % 60);
            const hundredths = Math.floor((startTime % 1) * 100);

            const timestamp = `[${String(minutes).padStart(2, "0")}:${String(
                seconds,
            ).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}]`;
            lrcContent += `${timestamp}${chunk.text.trim()}\n`;
        });

        const blob = new Blob([lrcContent], { type: "text/plain" });
        saveBlob(blob, `${getBaseFilename()}.lrc`);
    };

    const exportSRT = () => {
        let chunks = transcribedData?.chunks ?? [];
        let srtContent = "";

        chunks.forEach((chunk, index) => {
            const startTime = chunk.timestamp[0];
            const endTime = chunk.timestamp[1] ?? chunk.timestamp[0];

            const formatSRTTime = (time: number) => {
                const hours = Math.floor(time / 3600);
                const minutes = Math.floor((time % 3600) / 60);
                const seconds = Math.floor(time % 60);
                const milliseconds = Math.floor((time % 1) * 1000);

                return `${String(hours).padStart(2, "0")}:${String(
                    minutes,
                ).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(
                    milliseconds,
                ).padStart(3, "0")}`;
            };

            srtContent += `${index + 1}\n${formatSRTTime(
                startTime,
            )} --> ${formatSRTTime(endTime)}\n${chunk.text.trim()}\n\n`;
        });

        const blob = new Blob([srtContent], { type: "text/plain" });
        saveBlob(blob, `${getBaseFilename()}.srt`);
    };

    const exportLRCAlt = () => {
        let chunks = transcribedData?.chunks ?? [];
        let lrcContent = "";

        chunks.forEach((chunk, index) => {
            const startTime = chunk.timestamp[0];

            // Check for gap with previous chunk
            if (index > 0) {
                const prevChunk = chunks[index - 1];
                const prevEndTime = prevChunk.timestamp[1];

                if (prevEndTime !== null) {
                    const gap = startTime - prevEndTime;

                    if (gap > 4) {
                        const emptyLineTime = prevEndTime + 4;
                        const minutes = Math.floor(emptyLineTime / 60);
                        const seconds = Math.floor(emptyLineTime % 60);
                        const hundredths = Math.floor((emptyLineTime % 1) * 100);

                        const timestamp = `[${String(minutes).padStart(2, "0")}:${String(
                            seconds,
                        ).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}]`;
                        lrcContent += `${timestamp}\n`;
                    }
                }
            }

            const minutes = Math.floor(startTime / 60);
            const seconds = Math.floor(startTime % 60);
            const hundredths = Math.floor((startTime % 1) * 100);

            const timestamp = `[${String(minutes).padStart(2, "0")}:${String(
                seconds,
            ).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}]`;
            lrcContent += `${timestamp}${chunk.text.trim()}\n`;
        });

        const blob = new Blob([lrcContent], { type: "text/plain" });
        saveBlob(blob, `${getBaseFilename()}_alt.lrc`);
    };

    // Scroll to the bottom when the component updates
    useEffect(() => {
        if (divRef.current) {
            const diff = Math.abs(
                divRef.current.offsetHeight +
                divRef.current.scrollTop -
                divRef.current.scrollHeight,
            );

            if (diff <= 64) {
                // We're close enough to the bottom, so scroll to the bottom
                divRef.current.scrollTop = divRef.current.scrollHeight;
            }
        }
    });

    // Scroll to active reference row
    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    }, [currentAudioTime]);

    return (
        <div
            ref={divRef}
            className='w-full flex flex-col my-2 p-4 max-h-[20rem] overflow-y-auto'
        >
            {transcribedData?.chunks &&
                transcribedData.chunks.map((chunk, i) => {
                    const currentTime = currentAudioTime ?? 0;
                    const startTime = chunk.timestamp[0];
                    const endTime = chunk.timestamp[1] ?? (i < transcribedData.chunks.length - 1 ? transcribedData.chunks[i + 1].timestamp[0] : Infinity);

                    const isActive = currentTime >= startTime && currentTime < endTime;

                    return (
                        <div
                            key={`${i}-${chunk.text}`}
                            ref={isActive ? activeRowRef : null}
                            className={`w-full flex flex-col sm:flex-row mb-2 rounded-lg p-4 shadow-xl shadow-black/5 ring-1 ring-slate-700/10 dark:ring-github-border dark:text-github-text transition-colors duration-200 cursor-pointer ${isActive
                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-blue-500/50 dark:ring-blue-500/50'
                                : 'bg-white dark:bg-github-secondary hover:bg-slate-50 dark:hover:bg-github-border'
                                }`}
                            onClick={() => onTimeStampClick && onTimeStampClick(chunk.timestamp[0])}
                        >
                            <div className='mr-5 mb-2 sm:mb-0 sm:mr-5 font-bold text-slate-900 dark:text-white'>
                                {formatAudioTimestamp(chunk.timestamp[0])}
                            </div>
                            {chunk.text}
                        </div>
                    );
                })
            }
            {
                transcribedData && !transcribedData.isBusy && (
                    <div className='w-full flex flex-wrap items-center justify-end gap-2'>
                        <span className='font-bold text-slate-900 dark:text-white mr-2'>Export :</span>
                        <button
                            onClick={exportTXT}
                            className='text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 inline-flex items-center'
                        >
                            TXT
                        </button>
                        <button
                            onClick={exportJSON}
                            className='text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 inline-flex items-center'
                        >
                            JSON
                        </button>
                        <button
                            onClick={exportSRT}
                            className='text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 inline-flex items-center'
                        >
                            SRT
                        </button>
                        <button
                            onClick={exportLRC}
                            className='text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 inline-flex items-center'
                        >
                            LRC
                        </button>
                        <button
                            onClick={exportLRCAlt}
                            className='text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 inline-flex items-center'
                        >
                            LRC alt
                        </button>
                    </div>
                )
            }
        </div >
    );
}
