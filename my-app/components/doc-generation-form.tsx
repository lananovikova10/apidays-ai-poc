'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { GenerateDocResponse } from '@/lib/huggingface'

export function DocGenerationForm() {
  const [openApiSpec, setOpenApiSpec] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [result, setResult] = useState<GenerateDocResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTextAreaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: (value: string) => void
  ) => {
    setter(e.target.value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openApiSpec, meetingNotes })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error generating documentation:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">OpenAPI Specification</label>
          <Textarea
            value={openApiSpec}
            onChange={(e) => handleTextAreaChange(e, setOpenApiSpec)}
            placeholder="Paste your OpenAPI specification here..."
            className="h-48"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Meeting Notes</label>
          <Textarea
            value={meetingNotes}
            onChange={(e) => handleTextAreaChange(e, setMeetingNotes)}
            placeholder="Paste your meeting notes here..."
            className="h-48"
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Documentation'}
        </Button>
      </form>

      {result && (
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-bold mb-4">Generated Documentation</h2>
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: result.documentation }} />
          </div>

          {result.followUpQuestions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Follow-up Questions</h3>
              <ul className="list-disc pl-6">
                {result.followUpQuestions.map((question: string, index: number) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  )
} 