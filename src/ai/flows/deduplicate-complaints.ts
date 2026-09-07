'use server';

/**
 * @fileOverview Deduplicates complaint entries using AI based on complainant details and complaint type.
 *
 * - deduplicateComplaints - A function that handles the complaint deduplication process.
 * - DeduplicateComplaintsInput - The input type for the deduplicateComplaints function.
 * - DeduplicateComplaintsOutput - The return type for the deduplicateComplaints function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DeduplicateComplaintsInputSchema = z.object({
  complaint1: z.string().describe('The first complaint entry.'),
  complaint2: z.string().describe('The second complaint entry.'),
});
export type DeduplicateComplaintsInput = z.infer<
  typeof DeduplicateComplaintsInputSchema
>;

const DeduplicateComplaintsOutputSchema = z.object({
  areDuplicates: z
    .boolean()
    .describe(
      'Whether the two complaints are duplicates based on complainant details and complaint type.'
    ),
  confidence: z
    .number()
    .describe(
      'A confidence score (0-1) indicating the certainty of the duplication assessment.'
    ),
  mergedComplaint: z
    .string()
    .optional()
    .describe(
      'A merged complaint entry if the complaints are duplicates, combining relevant information. Only populate if duplicates.'
    ),
});
export type DeduplicateComplaintsOutput = z.infer<
  typeof DeduplicateComplaintsOutputSchema
>;

export async function deduplicateComplaints(
  input: DeduplicateComplaintsInput
): Promise<DeduplicateComplaintsOutput> {
  return deduplicateComplaintsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'deduplicateComplaintsPrompt',
  input: {schema: DeduplicateComplaintsInputSchema},
  output: {schema: DeduplicateComplaintsOutputSchema},
  prompt: `You are an expert data analyst specializing in identifying duplicate complaint entries.

You will receive two complaint entries, and your task is to determine if they are duplicates based on complainant details and complaint type.

Complaint 1: {{{complaint1}}}
Complaint 2: {{{complaint2}}}

Consider the complainant details (name, contact information) and the type of complaint to assess duplication.

Output in JSON format whether the complaints are duplicates (areDuplicates: boolean), a confidence score (confidence: number between 0 and 1), and a merged complaint entry (mergedComplaint: string, only if duplicates).`,
});

const deduplicateComplaintsFlow = ai.defineFlow(
  {
    name: 'deduplicateComplaintsFlow',
    inputSchema: DeduplicateComplaintsInputSchema,
    outputSchema: DeduplicateComplaintsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
