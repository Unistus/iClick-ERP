'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting prescription details from an image.
 *
 * - readPrescription - A function that extracts drug names, dosages, and patient/doctor information from an uploaded prescription image.
 * - AIPrescriptionReaderInput - The input type for the readPrescription function.
 * - AIPrescriptionReaderOutput - The return type for the readPrescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIPrescriptionReaderInputSchema = z.object({
  prescriptionImageDataUri: z
    .string()
    .describe(
      "A photo of a prescription, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AIPrescriptionReaderInput = z.infer<
  typeof AIPrescriptionReaderInputSchema
>;

const AIPrescriptionReaderOutputSchema = z.object({
  drugNames: z
    .array(z.string())
    .describe('A list of all drug names identified in the prescription.'),
  dosages: z
    .array(z.string())
    .describe(
      'A list of dosages corresponding to the identified drugs. Each dosage should be a string (e.g., "50mg once daily").'
    ),
  patientInfo: z
    .object({
      name: z.string().optional().describe("The patient's full name."),
      dob: z
        .string()
        .optional()
        .describe("The patient's date of birth (e.g., 'YYYY-MM-DD')."),
      address: z.string().optional().describe("The patient's address."),
    })
    .describe("Extracted information about the patient."),
  doctorInfo: z
    .object({
      name: z.string().optional().describe("The doctor's full name."),
      clinic: z
        .string()
        .optional()
        .describe("The name of the doctor's clinic or hospital."),
      contact: z
        .string()
        .optional()
        .describe(
          "The doctor's contact information, such as phone number or email."
        ),
    })
    .describe("Extracted information about the prescribing doctor."),
});
export type AIPrescriptionReaderOutput = z.infer<
  typeof AIPrescriptionReaderOutputSchema
>;

export async function readPrescription(
  input: AIPrescriptionReaderInput
): Promise<AIPrescriptionReaderOutput> {
  return aiPrescriptionReaderFlow(input);
}

const prescriptionReaderPrompt = ai.definePrompt({
  name: 'prescriptionReaderPrompt',
  input: {schema: AIPrescriptionReaderInputSchema},
  output: {schema: AIPrescriptionReaderOutputSchema},
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are an AI assistant specialized in reading medical prescriptions. Your task is to accurately extract key information from an uploaded prescription image.
Identify and list all drug names, their corresponding dosages, and any available patient and doctor information.

Patient information should include their name, date of birth, and address if present.
Doctor information should include their name, clinic, and contact details if present.

Please provide the output in the specified JSON format.

Prescription Image: {{media url=prescriptionImageDataUri}}`,
});

const aiPrescriptionReaderFlow = ai.defineFlow(
  {
    name: 'aiPrescriptionReaderFlow',
    inputSchema: AIPrescriptionReaderInputSchema,
    outputSchema: AIPrescriptionReaderOutputSchema,
  },
  async input => {
    const {output} = await prescriptionReaderPrompt(input);
    if (!output) {
      throw new Error('Failed to extract information from prescription.');
    }
    return output;
  }
);
