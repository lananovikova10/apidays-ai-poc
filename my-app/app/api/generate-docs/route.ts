import { NextResponse } from 'next/server'
import { generateDocumentation } from '@/lib/huggingface'
import { z } from 'zod'

const GenerateDocsSchema = z.object({
  openApiSpec: z.string().min(1, 'OpenAPI specification is required'),
  meetingNotes: z.string().optional().default(''),
  chatContext: z.array(z.object({
    role: z.enum(['assistant', 'user']),
    content: z.string()
  })).optional()
})

export async function POST(req: Request) {
  try {
    console.log('Starting documentation generation request')

    const body = await req.json()
    console.log('Request body received:', {
      specLength: body.openApiSpec?.length,
      hasNotes: !!body.meetingNotes,
      hasContext: !!body.chatContext
    })

    const { openApiSpec, meetingNotes, chatContext } = GenerateDocsSchema.parse(body)

    console.log('Validated input, calling generateDocumentation')

    try {
      const result = await generateDocumentation(openApiSpec, meetingNotes, chatContext)
      
      console.log('Generation result:', {
        hasDoc: !!result.documentation,
        docLength: result.documentation?.length,
        questionsCount: result.followUpQuestions?.length
      })

      if (!result.documentation) {
        throw new Error('No documentation content generated')
      }

      return NextResponse.json(result)
    } catch (genError: unknown) {
      console.error('Generation error:', genError)
      throw new Error(`Generation failed: ${genError instanceof Error ? genError.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error('API error:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    })

    return NextResponse.json({
      documentation: '# Error\nFailed to generate documentation. Please try again.',
      followUpQuestions: ['Would you like to try again?'],
      error: {
        message: (error as Error).message,
        type: (error as Error).name
      }
    }, { 
      status: 200
    })
  }
}