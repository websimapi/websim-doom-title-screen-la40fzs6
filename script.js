// Basic script file - can be expanded later for interactions
import { audioContext, onContextReady } from './music_player.js';

console.log("DOOM title screen loaded!");

let buttonHoverBuffer = null;

// Function to load a sound effect buffer
// This function now REQUIRES an active AudioContext instance
async function loadSound(audioContext, url) {
    if (!audioContext || audioContext.state === 'closed') {
        console.error("Cannot load sound: AudioContext is not available or closed.");
        return null;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load sound: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        // Use the provided audioContext to decode the data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    } catch (error) {
        console.error('Error loading sound:', error);
        return null;
    }
}

// Function to play a loaded sound buffer
function playSound(buffer) {
    // Check if the buffer is loaded and audioContext is available and running
    if (!buffer) {
        console.warn("Sound buffer not loaded.");
        return;
    }
     if (!audioContext || audioContext.state !== 'running') {
        // console.warn("Audio context not initialized or not running.");
        return; // Silently fail if context isn't ready to play sound
     }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
}

// Wait for the DOM to be fully loaded before trying to find buttons
document.addEventListener('DOMContentLoaded', () => {
    // Detect if the browser is likely automated (e.g., Puppeteer)
    // and add a class to the body for CSS targeting.
    if (navigator.webdriver) {
        document.body.classList.add('is-automated');
        console.log("navigator.webdriver is true - likely automated. Hiding menu buttons.");
    } else {
        document.body.classList.add('is-human');
        console.log("navigator.webdriver is false or undefined - likely human.");
    }

    // Use the onContextReady callback from music_player.js to
    // load sound effects and attach listeners *after* the audio context is created.
    onContextReady(async (activeAudioContext) => {
        console.log("AudioContext is ready in script.js, loading sounds...");
        // Load the hover sound using the active context instance
        buttonHoverBuffer = await loadSound(activeAudioContext, '/button_hover.mp3');

        // Add hover listeners to buttons, but only if not automated
        if (!document.body.classList.contains('is-automated')) {
            const buttons = document.querySelectorAll('.main-menu button');
            buttons.forEach(button => {
                button.addEventListener('mouseover', () => {
                    // playSound itself checks if the context is running before playing
                    playSound(buttonHoverBuffer);
                });
            });
             console.log("Button hover listeners attached.");
        } else {
             console.log("Automated browser detected, skipping button hover listeners.");
        }
    });
});