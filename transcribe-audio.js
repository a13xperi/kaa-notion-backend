#!/usr/bin/env node

/**
 * Audio Transcription Script
 * Transcribes audio files using OpenAI Whisper API
 * 
 * Usage: node transcribe-audio.js <audio-file-path>
 * Example: node transcribe-audio.js "/Users/alex/Downloads/Signe talking with building manager, Sergio.m4a"
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in environment variables');
  console.log('\nPlease add OPENAI_API_KEY to your .env file:');
  console.log('OPENAI_API_KEY=your_api_key_here\n');
  process.exit(1);
}

async function transcribeAudio(audioFilePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`File not found: ${audioFilePath}`);
    }

    console.log(`📁 Reading audio file: ${path.basename(audioFilePath)}`);
    const fileStats = fs.statSync(audioFilePath);
    console.log(`📊 File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Read the audio file
    const audioFile = fs.createReadStream(audioFilePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', audioFile, {
      filename: path.basename(audioFilePath),
      contentType: 'audio/m4a'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optional: specify language for better accuracy

    console.log('\n🔄 Sending to OpenAI Whisper API...');
    console.log('⏳ This may take a few moments depending on file size...\n');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    
    if (!result.text) {
      throw new Error('No transcription text returned from API');
    }

    return result.text;

  } catch (error) {
    console.error('❌ Transcription failed:', error.message);
    throw error;
  }
}

async function main() {
  const audioFilePath = process.argv[2];

  if (!audioFilePath) {
    console.error('❌ Error: Please provide an audio file path');
    console.log('\nUsage: node transcribe-audio.js <audio-file-path>');
    console.log('Example: node transcribe-audio.js "/Users/alex/Downloads/audio.m4a"\n');
    process.exit(1);
  }

  try {
    const transcription = await transcribeAudio(audioFilePath);
    
    console.log('✅ Transcription complete!\n');
    console.log('='.repeat(80));
    console.log('TRANSCRIPTION:');
    console.log('='.repeat(80));
    console.log(transcription);
    console.log('='.repeat(80));

    // Save to file
    const outputPath = audioFilePath.replace(/\.[^/.]+$/, '_transcript.txt');
    fs.writeFileSync(outputPath, transcription, 'utf-8');
    console.log(`\n💾 Transcript saved to: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ Failed to transcribe audio:', error.message);
    process.exit(1);
  }
}

main();



