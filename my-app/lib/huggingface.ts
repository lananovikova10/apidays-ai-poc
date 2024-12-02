import { HfInference } from '@huggingface/inference'

if (!process.env.HUGGING_FACE_API_KEY) {
  throw new Error('Missing HUGGING_FACE_API_KEY environment variable')
}

export const hf = new HfInference(process.env.HUGGING_FACE_API_KEY)

export type GenerateDocResponse = {
  documentation: string
  followUpQuestions: string[]
}

export async function generateDocumentation(
  openApiSpec: string,
  meetingNotes: string
): Promise<GenerateDocResponse> {
  const prompt = `
    Based on the following OpenAPI specification and meeting notes, generate documentation sections.
    
    OpenAPI Spec:
    ${openApiSpec}
    
    Meeting Notes:
    ${meetingNotes}
    
    Generate detailed documentation sections including:
    1. Overview
    2. Authentication
    3. Main Endpoints
    4. Data Models
    
    Also generate follow-up questions to improve the documentation.
  `

  const response = await hf.textGeneration({
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    inputs: prompt,
    parameters: {
      max_new_tokens: 1000,
      temperature: 0.7,
      top_p: 0.95
    }
  })

  // Parse the response to extract documentation and questions
  const sections = response.generated_text.split('Follow-up Questions:')
  
  return {
    documentation: sections[0].trim(),
    followUpQuestions: sections[1]
      ? sections[1]
        .trim()
        .split('\n')
        .filter((q: string) => q.length > 0)
      : []
  }
} 