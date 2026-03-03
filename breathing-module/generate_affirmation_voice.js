const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_55a781d8cf3fdea9e57a2f25e81f6b8cd87c03a3890aa268';
// Rachel is a popular calming female voice
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
const ENDPOINT = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const text = `
Take a slow, deep breath in... and let it out.
You are safe. You are exactly where you need to be.
Let go of any tension in your shoulders, and your jaw.
Your mind is calm. Your body is relaxed.
With every breath, you draw in peace.
With every exhale, you release whatever no longer serves you.
You are strong, you are capable, and you are at peace.
Breathe. Relax. Let go.
`;

async function generateAffirmations() {
    console.log('Generating spoken affirmations via TTS...');
    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'xi-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.8,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const buffer = await response.arrayBuffer();
        const outputPath = path.join(__dirname, 'assets', 'audio', 'affirmations.mp3');
        fs.writeFileSync(outputPath, Buffer.from(buffer));
        console.log(`Saved NEW affirmations.mp3 successfully with spoken words!`);
    } catch (error) {
        console.error(`Error generating affirmations:`, error);
    }
}

generateAffirmations();
