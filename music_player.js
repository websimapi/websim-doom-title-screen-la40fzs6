export let audioContext = null;
let currentSource = null;
const musicFiles = [
    '/Hellforge - Chainsaw Glory (Extended 1) - Sonauto.ogg',
    // Add more music files here if needed in the future
];
let currentTrackIndex = 0;

// Array to hold callbacks that need to run when audioContext is ready
const contextReadyCallbacks = [];

/**
 * Register a callback to be executed when the audioContext is initialized.
 * If context is already ready, the callback is executed immediately.
 * @param {function(AudioContext): void} callback - The function to call with the initialized AudioContext.
 */
export function onContextReady(callback) {
    if (audioContext && audioContext.state !== 'closed') {
        // If context is already created (though maybe suspended), call immediately
        callback(audioContext);
    } else {
        // Otherwise, queue the callback
        contextReadyCallbacks.push(callback);
    }
}

async function loadAndPlayTrack(index) {
    // audioContext is created in handleFirstInteraction before this is called
    if (!audioContext) {
         console.error("AudioContext is not initialized when trying to load and play track.");
         return;
    }

    // Ensure context is running, especially important after it might have been suspended
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    if (currentSource) {
        currentSource.stop();
        currentSource.disconnect();
        currentSource = null;
    }

    const trackUrl = musicFiles[index];
    try {
        const response = await fetch(trackUrl);
        if (!response.ok) {
            throw new Error(`Failed to load audio: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        currentSource = audioContext.createBufferSource();
        currentSource.buffer = audioBuffer;

        // Create a gain node for potential volume control later
        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        currentSource.connect(gainNode);

        currentSource.onended = () => {
            console.log(`Track ${index} ended.`);
            // Play the next track (looping for now as there's only one)
            currentTrackIndex = (currentTrackIndex + 1) % musicFiles.length;
            loadAndPlayTrack(currentTrackIndex);
        };

        currentSource.start(0); // Start playback immediately
        console.log(`Playing track: ${trackUrl}`);

    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

// Listen for the first click or keydown to start the music and resume audio context
async function handleFirstInteraction() {
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
    console.log("First interaction detected, initializing audio context.");

    // Create AudioContext on first interaction
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext created.");

        // Once context is created and potentially resumed, run queued callbacks
        while(contextReadyCallbacks.length > 0) {
            const callback = contextReadyCallbacks.shift();
            try {
                callback(audioContext);
            } catch (error) {
                console.error("Error in context ready callback:", error);
            }
        }
    }

    // Resume context if needed (it might be suspended initially or after inactivity)
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log("AudioContext resumed.");
    }

    // Start music playback
    loadAndPlayTrack(currentTrackIndex);
}

// Add event listeners to trigger handleFirstInteraction
document.addEventListener('click', handleFirstInteraction, { once: true });
document.addEventListener('keydown', handleFirstInteraction, { once: true });

console.log("Music player loaded. Waiting for first interaction...");