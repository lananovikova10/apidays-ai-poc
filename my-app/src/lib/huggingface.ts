import { HfInference } from '@huggingface/inference'

if (!process.env.HUGGING_FACE_API_KEY) {
  throw new Error('Missing HUGGING_FACE_API_KEY environment variable')
}

export const hf = new HfInference(process.env.HUGGING_FACE_API_KEY)

export type GenerateDocResponse = {
  documentation: string
  followUpQuestions: string[]
}

// Extract structured context from OpenAPI spec
function extractContext(openApiSpec: string) {
  try {
    const spec = JSON.parse(openApiSpec)
    return {
      info: spec.info || {},
      paths: Object.keys(spec.paths || {}).map(path => ({
        path,
        operations: Object.keys(spec.paths[path] || {})
      })),
      security: spec.components?.securitySchemes || {},
      schemas: Object.keys(spec.components?.schemas || {}),
      scopes: Object.values(spec.components?.securitySchemes || {})
        .flatMap((scheme: any) => Object.keys(scheme.flows?.authorizationCode?.scopes || {}))
    }
  } catch {
    // If JSON parsing fails, try to extract info using regex
    return {
      info: {
        title: openApiSpec.match(/title:\s*"([^"]+)"/)?.[1] || '',
        version: openApiSpec.match(/version:\s*"([^"]+)"/)?.[1] || ''
      },
      paths: (openApiSpec.match(/paths:([\s\S]*?)(?=\n\w+:|\Z)/m)?.[1] || '')
        .split('\n')
        .filter(line => line.trim().startsWith('/'))
        .map(path => ({
          path: path.trim().split(':')[0],
          operations: []
        })),
      security: {},
      schemas: [],
      scopes: []
    }
  }
}

async function generateSection(
  section: string,
  openApiSpec: string,
  meetingNotes: string,
  chatContext?: { role: 'assistant' | 'user'; content: string }[]
): Promise<string> {
  // Extract structured context
  const context = extractContext(openApiSpec)
  
  const sectionPrompts: Record<string, string> = {
    Overview: `Generate a clear and concise "Overview" section for the API.

Context:
Title: ${context.info.title || '[Title not specified]'}
Version: ${context.info.version || '[Version not specified]'}
Available Endpoints: ${context.paths.map(p => p.path).join(', ') || '[Endpoints not specified]'}
Security: ${Object.keys(context.security).join(', ') || '[Security schemes not specified]'}

Instructions:
- If any information is missing, use placeholders like: [Insert <missing detail> here]
- Start with "# Overview"
- Keep content clear and concise`,
    
    Authentication: `Generate an "Authentication" section for the API documentation.

Context:
Security Schemes: ${Object.keys(context.security).join(', ') || '[Security schemes not specified]'}
Available Scopes: ${context.scopes.join(', ') || '[Scopes not specified]'}

Instructions:
- If security details are missing, use placeholders: [Insert <security detail> here]
- Start with "# Authentication"
- Include authentication flow if available`,
    
    'Error Handling': `Generate an "Error Handling" section for the API documentation.

Context:
Endpoints: ${context.paths.map(p => p.path).join(', ') || '[Endpoints not specified]'}
Data Models: ${context.schemas.join(', ') || '[Data models not specified]'}

Instructions:
- For missing error codes or descriptions, use: [Insert <error detail> here]
- Start with "# Error Handling"
- Use tables for error codes and descriptions`,
    
    Glossary: `Generate a "Glossary" section for the API documentation.

Context:
Security Terms: ${Object.keys(context.security).join(', ') || '[Security terms not specified]'}
Data Models: ${context.schemas.join(', ') || '[Data models not specified]'}
Scopes: ${context.scopes.join(', ') || '[Scopes not specified]'}

Instructions:
- For undefined terms, use: [Insert <term definition> here]
- Start with "# Glossary"
- List terms alphabetically`
  }

  const prompt = `You are a technical writer. Generate documentation based on this context:

${sectionPrompts[section]}

Additional Context:
${meetingNotes ? `Meeting Notes:\n${meetingNotes}\n` : '[No meeting notes provided]'}
${chatContext?.length ? `Discussion Points:\n${chatContext.map(msg => msg.content).join('\n')}` : '[No discussion points available]'}

Important:
- When information is missing, use placeholders: [Insert <detail> here]
- Start directly with the section header
- Do not include any instructions or prompts in the output
- Keep content clear and concise
- Use proper markdown formatting`

  const response = await hf.textGeneration({
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    inputs: prompt,
    parameters: {
      max_new_tokens: 1000,
      temperature: 0.3,
      top_p: 0.8,
      repetition_penalty: 1.1,
      return_full_text: false,
      do_sample: false
    }
  })

  // Clean up any potential prompt leakage
  let cleanedText = response.generated_text?.trim() || `# ${section}\nNo content generated for this section.`
  
  // Remove any instruction text that might have leaked
  cleanedText = cleanedText
    .replace(/^.*?# /m, '# ') // Remove anything before the first heading
    .replace(/Instructions:.*?\n/g, '') // Remove instruction lines
    .replace(/Format.*?markdown.*?\n/g, '') // Remove format instructions
    .replace(/Include:.*?\n/g, '') // Remove include instructions
    .replace(/Important:.*?\n/g, '') // Remove important notes
    .replace(/Context:.*?\n/g, '') // Remove context markers
    .replace(/\n{3,}/g, '\n\n') // Clean up excessive newlines
    .trim()

  return cleanedText
}

async function generateGettingStartedSection(
  openApiSpec: string,
  meetingNotes: string,
  chatContext?: { role: 'assistant' | 'user'; content: string }[]
): Promise<string> {
  const subsections = [
    {
      title: 'Prerequisites',
      prompt: 'List required credentials, tools, dependencies, and knowledge. Use [Insert <requirement> here] for missing details.'
    },
    {
      title: 'Quick Start Guide',
      prompt: 'Create a step-by-step guide. Use [Insert <step detail> here] for missing information.'
    },
    {
      title: 'Basic Operations',
      prompt: 'Include 2–3 examples of common operations. Use [Insert <example detail> here] for missing specifics.'
    },
    {
      title: 'Next Steps',
      prompt: 'Suggest advanced usage and improvements. Use [Insert <suggestion> here] for missing recommendations.'
    }
  ]

  const sectionPromises = subsections.map(async (subsection) => {
    const prompt = `Generate the "${subsection.title}" subsection for the Getting Started guide.

Context:
${openApiSpec}
${meetingNotes ? `\nAdditional Notes:\n${meetingNotes}` : ''}
${chatContext?.length ? `\nDiscussion Points:\n${chatContext.map(msg => msg.content).join('\n')}` : ''}

Instructions:
${subsection.prompt}

Format as markdown, starting with "## ${subsection.title}".
Keep the content practical and implementation-agnostic.
Focus on clear, actionable guidance.`

    const response = await hf.textGeneration({
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.3,
        top_p: 0.8,
        repetition_penalty: 1.1,
        return_full_text: false,
        do_sample: false
      }
    })

    return response.generated_text?.trim() || `## ${subsection.title}\nNo content generated for this subsection.`
  })

  const subsectionTexts = await Promise.all(sectionPromises)
  return `# Getting Started\n\n${subsectionTexts.join('\n\n')}`
}

export async function generateDocumentation(
  openApiSpec: string,
  meetingNotes: string = '',
  chatContext?: { role: 'assistant' | 'user'; content: string }[]
): Promise<GenerateDocResponse> {
  try {
    console.log('Starting documentation generation')

    // Generate Getting Started section separately
    const gettingStartedSection = await generateGettingStartedSection(
      openApiSpec,
      meetingNotes,
      chatContext
    )

    // Generate other sections
    const otherSections = await Promise.all([
      generateSection('Overview', openApiSpec, meetingNotes, chatContext),
      generateSection('Authentication', openApiSpec, meetingNotes, chatContext),
      generateSection('Error Handling', openApiSpec, meetingNotes, chatContext),
      generateSection('Glossary', openApiSpec, meetingNotes, chatContext)
    ])

    // Combine all sections
    const documentation = [
      otherSections[0], // Overview
      otherSections[1], // Authentication
      gettingStartedSection,
      otherSections[2], // Error Handling
      otherSections[3]  // Glossary
    ].join('\n\n')

    // Generate follow-up questions
    const questionsPrompt = `Based on this documentation, suggest three specific follow-up questions for improvement:

${documentation}

Generate three concise follow-up questions.`

    const questionsResponse = await hf.textGeneration({
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      inputs: questionsPrompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.3,
        top_p: 0.8,
        repetition_penalty: 1.1,
        return_full_text: false,
        do_sample: false
      }
    })

    const questions = questionsResponse.generated_text
      ?.split(/\d+\.|\n-|\n\*/g)
      .map(q => q.trim())
      .filter(q => q.length > 0) || [
        'How can we improve the documentation clarity?',
        'What additional examples would be helpful?',
        'Are there any sections that need more detail?'
      ]

    return {
      documentation,
      followUpQuestions: questions.slice(0, 3)
    }

  } catch (error: any) {
    console.error('Error in generateDocumentation:', error)
    return {
      documentation: `# Error\nFailed to generate documentation: ${error?.message || 'Unknown error'}. Please try again.`,
      followUpQuestions: ['Would you like to try again?']
    }
  }
}