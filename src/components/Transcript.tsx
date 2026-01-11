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
            .map((chunk) => chunk.text.trim())
            .join("\n")
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

    const exportTTML = () => {
        let chunks = transcribedData?.chunks ?? [];
        let ttmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling" xml:lang="en">
  <head>
    <styling>
      <style id="1" tts:fontSize="14" tts:fontFamily="Arial" tts:textAlign="center" tts:color="white" tts:backgroundColor="black"/>
    </styling>
  </head>
  <body>
    <div>
`;

        const formatTTMLTime = (time: number) => {
            const hours = Math.floor(time / 3600);
            const minutes = Math.floor((time % 3600) / 60);
            const seconds = Math.floor(time % 60);
            const milliseconds = Math.floor((time % 1) * 1000);

            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
        };

        // Strict grouping heuristics for cleaner captions
        let lines: typeof chunks[] = [];
        let currentLine: typeof chunks = [];

        chunks.forEach((chunk, index) => {
            const text = chunk.text.trim();
            const prevChunk = index > 0 ? chunks[index - 1] : null;

            let shouldBreak = false;

            if (currentLine.length > 0 && prevChunk) {
                // 1. Break on Punctuation (Sentence boundaries)
                if (/[.?!]$/.test(prevChunk.text.trim())) {
                    shouldBreak = true;
                }

                // 2. Break on Time Gap (Silence > 0.3s)
                const prevEnd = prevChunk.timestamp[1] ?? prevChunk.timestamp[0];
                const currStart = chunk.timestamp[0];
                if (!shouldBreak && (currStart - prevEnd > 0.3)) {
                    shouldBreak = true;
                }

                // 3. Break on Length (> 60 chars) to allow for rap/conversation
                const currentLength = currentLine.reduce((acc, c) => acc + c.text.length, 0);
                if (!shouldBreak && (currentLength + text.length > 60)) {
                    shouldBreak = true;
                }
            }

            if (shouldBreak) {
                lines.push(currentLine);
                currentLine = [];
            }

            currentLine.push(chunk);

            if (index === chunks.length - 1) {
                lines.push(currentLine);
            }
        });

        lines.forEach((line) => {
            if (line.length === 0) return;

            const firstChunk = line[0];
            const lastChunk = line[line.length - 1];

            const pStart = firstChunk.timestamp[0];
            const pEnd = lastChunk.timestamp[1] ?? lastChunk.timestamp[0];

            ttmlContent += `      <p begin="${formatTTMLTime(pStart)}" end="${formatTTMLTime(pEnd)}" style="1">\n`;

            line.forEach((chunk) => {
                const cStart = chunk.timestamp[0];
                const cEnd = chunk.timestamp[1] ?? cStart;
                const safeText = chunk.text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                ttmlContent += `        <span begin="${formatTTMLTime(cStart)}" end="${formatTTMLTime(cEnd)}">${safeText}</span>\n`;
            });

            ttmlContent += `      </p>\n`;
        });

        ttmlContent += `    </div>
  </body>
</tt>`;

        const blob = new Blob([ttmlContent], { type: "application/xml" });
        saveBlob(blob, `${getBaseFilename()}.ttml`);
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
                        <button
                            onClick={exportTTML}
                            className='text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800 inline-flex items-center'
                        >
                            TTML
                        </button>
                    </div>
                )
            }
        </div >
    );
}
