const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_55a781d8cf3fdea9e57a2f25e81f6b8cd87c03a3890aa268';
const ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';

const sounds = [
  { name: 'forest.mp3', prompt: 'Seamless looping ambient forest sounds with distant birds chirping, gentle rustling leaves, peaceful, calm nature.' },
  { name: 'ocean.mp3', prompt: 'Seamless looping gentle ocean waves slowly crashing on a sandy beach, relaxing, continuous, steady.' },
  { name: 'meditation.mp3', prompt: 'Seamless looping deep relaxing meditation singing bowl drone, continuous, healing frequencies, calm.' },
  { name: 'binaural.mp3', prompt: 'Seamless looping soft binaural beats for focus and relaxation, gentle ambient drone, continuous.' }
];

async function generateSound(sound) {
  console.log(`Generating ${sound.name}...`);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: sound.prompt,
        duration_seconds: 20,
        prompt_influence: 0.3
      })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
    }

    const buffer = await response.arrayBuffer();
    const outputPath = path.join(__dirname, 'assets', 'audio', sound.name);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`Saved ${sound.name} successfully.`);
  } catch (error) {
    console.error(`Error generating ${sound.name}:`, error);
  }
}

async function main() {
  const audioDir = path.join(__dirname, 'assets', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  for (const sound of sounds) {
    await generateSound(sound);
  }
}

main();
