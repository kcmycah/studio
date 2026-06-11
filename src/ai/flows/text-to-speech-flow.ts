
'use server';
/**
 * @fileOverview A Genkit flow for generating high-quality speech from text using Gemini TTS.
 * This is used to make audit reports accessible for visually impaired users.
 *
 * - textToSpeech - A function that converts text to a base64 encoded WAV data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const TTSInputSchema = z.string().describe('The text to convert to speech.');
const TTSOutputSchema = z.object({
  media: z.string().describe('The base64 encoded WAV audio as a data URI.'),
});

export type TTSOutput = z.infer<typeof TTSOutputSchema>;

/**
 * Converts PCM data to a WAV formatted base64 string.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export async function textToSpeech(text: string): Promise<TTSOutput> {
  return ttsFlow(text);
}

const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: TTSInputSchema,
    outputSchema: TTSOutputSchema,
  },
  async (text) => {
    try {
      const { media } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Algenib' },
            },
          },
        },
        prompt: text,
      });

      if (!media) {
        throw new Error('No audio media returned from AI model.');
      }

      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );

      const wavBase64 = await toWav(audioBuffer);

      return {
        media: 'data:audio/wav;base64,' + wavBase64,
      };
    } catch (error: any) {
      console.error('TTS Flow Error:', error);
      throw error;
    }
  }
);
