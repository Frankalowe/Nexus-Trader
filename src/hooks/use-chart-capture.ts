import { useState, useRef, useCallback } from 'react';

export function useChartCapture() {
    const [isCapturing, setIsCapturing] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const captureScreen = async () => {
        try {
            setIsCapturing(true);

            // If we don't have a stream or the current one is inactive, request a new one
            if (!streamRef.current || !streamRef.current.active) {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        displaySurface: "browser",
                    } as any,
                    audio: false,
                    // @ts-ignore
                    preferCurrentTab: true,
                    selfBrowserSurface: "include",
                    monitorTypeSurfaces: "exclude"
                });

                // Add listener to nullify ref if user stops sharing via browser UI
                stream.getVideoTracks()[0].onended = () => {
                    streamRef.current = null;
                };

                streamRef.current = stream;
            }

            const video = document.createElement("video");
            video.srcObject = streamRef.current;
            video.muted = true;

            await video.play();

            // Increased wait to 1000ms to ensure the video stream has a frame populated
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) throw new Error("Could not get canvas context");

            ctx.drawImage(video, 0, 0);

            // Convert to base64
            const base64 = canvas.toDataURL("image/png");

            // We DO NOT stop the stream here so it can be reused
            setIsCapturing(false);
            return base64;

        } catch (error) {
            console.error("Capture failed:", error);
            setIsCapturing(false);
            return null;
        }
    };

    return { captureScreen, isCapturing, stopStream, hasActiveStream: !!streamRef.current?.active };
}
