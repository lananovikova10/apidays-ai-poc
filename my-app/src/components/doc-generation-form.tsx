'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { GenerateDocResponse } from '@/lib/huggingface'
import { Copy, Check, Send, FileText, Download } from 'lucide-react'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
}

type FormStage = 'input' | 'chat' | 'output'

export function DocGenerationForm() {
  const [openApiSpec, setOpenApiSpec] = useState<string>('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [result, setResult] = useState<GenerateDocResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [stage, setStage] = useState<FormStage>('input')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [generationStatus, setGenerationStatus] = useState<string>('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setOpenApiSpec('')
      setFileName('')
      return
    }

    setFileName(file.name)
    
    try {
      const text = await file.text()
      // Validate if it's a valid JSON/YAML
      try {
        JSON.parse(text)
      } catch (e) {
        // If not JSON, assume it's YAML (you might want to add YAML validation)
        console.log('File appears to be YAML')
      }
      setOpenApiSpec(text)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error reading file. Please ensure it\'s a valid OpenAPI specification file.')
      setOpenApiSpec('')
      setFileName('')
    }
  }

  const isFormValid = openApiSpec.trim() !== ''

  const startChat = async () => {
    if (!isFormValid) return
    setStage('chat')
    const initialMessage: ChatMessage = {
      role: 'assistant',
      content: "I've reviewed your OpenAPI specification and meeting notes. Let me ask a few questions to better understand your documentation needs:\n\n1. What's the primary audience for this documentation?\n2. Are there specific endpoints that need detailed explanation?\n3. Would you like to include code examples in specific languages?"
    }
    setChatMessages([initialMessage])
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentMessage.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage
    }

    setChatMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setLoading(true)

    try {
      // Continue with chat
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: await getAIResponse(currentMessage, chatMessages)
      }
      
      setChatMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error in chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateFinalDocs = async () => {
    setStage('output')
    setLoading(true)
    setProgress(0)
    
    // Start progress animation
    setGenerationStatus('Analyzing inputs...')
    setProgress(20)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setGenerationStatus('Processing chat context...')
    setProgress(40)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setGenerationStatus('Generating documentation structure...')
    setProgress(60)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      setGenerationStatus('Generating final documentation...')
      setProgress(80)
      
      const response = await fetch('/api/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          openApiSpec, 
          meetingNotes,
          chatContext: chatMessages 
        })
      })

      if (!response.ok) throw new Error('Failed to generate documentation')
      const data = await response.json()
      
      setGenerationStatus('Finalizing documentation...')
      setProgress(100)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setResult(data)
      setGenerationStatus('Documentation generated successfully!')
    } catch (error) {
      console.error('Error generating documentation:', error)
      alert('Failed to generate documentation. Please try again.')
      setGenerationStatus('Generation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.documentation) return

    try {
      await navigator.clipboard.writeText(result.documentation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleDownload = () => {
    if (!result?.documentation) return

    // Create blob with markdown content
    const blob = new Blob([result.documentation], { type: 'text/markdown' })
    const url = window.URL.createObjectURL(blob)
    
    // Create temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = 'api-documentation.md'
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const renderOutput = () => {
    if (!result?.documentation) return null

    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Markdown Source</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8"
              title="Download markdown file"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-auto">
          {result.documentation}
        </pre>

        {/* Follow-up Questions */}
        {result.followUpQuestions?.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-xl font-bold mb-4">Follow-up Questions</h3>
            <ul className="list-disc pl-6 space-y-2">
              {result.followUpQuestions.map((question: string, index: number) => (
                <li 
                  key={index} 
                  className="text-slate-700 dark:text-slate-300 break-words"
                >
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    )
  }

  // Render different stages
  const renderStage = () => {
    switch (stage) {
      case 'input':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">OpenAPI Specification</label>
              <div className="flex flex-col gap-2">
                <Input
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {fileName && (
                  <p className="text-sm text-muted-foreground">
                    Selected file: {fileName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                Meeting Notes
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </label>
              <Textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Add any additional context or meeting notes here..."
                className="h-48"
              />
            </div>

            <Button 
              onClick={startChat} 
              disabled={!isFormValid}
              className="w-full"
            >
              Continue to Clarifying Questions
            </Button>
          </div>
        )

      case 'chat':
        return (
          <div className="space-y-6">
            <Card className="p-4 max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'assistant' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'assistant'
                          ? 'bg-secondary'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex gap-2">
              <form onSubmit={handleChatSubmit} className="flex-1 flex gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Add to the conversation..."
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={loading || !currentMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              <Button 
                onClick={generateFinalDocs}
                className="flex-none"
                disabled={loading}
              >
                Generate Documentation
              </Button>
            </div>
          </div>
        )

      case 'output':
        return (
          <div className="space-y-6">
            {loading ? (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 animate-pulse" />
                    <h3 className="text-lg font-semibold">{generationStatus}</h3>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </Card>
            ) : result ? (
              <>
                {renderOutput()}
                <Button 
                  onClick={() => setStage('chat')}
                  variant="outline"
                  className="w-full mt-6"
                  disabled={loading}
                >
                  Return to Chat
                </Button>
              </>
            ) : null}
          </div>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderStage()}
    </div>
  )
}

// Update the AI response function to remove generation trigger
async function getAIResponse(message: string, context: ChatMessage[]): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate delay
  
  const lastAssistantMessage = context.findLast(msg => msg.role === 'assistant')
  const userMessage = message.toLowerCase()

  if (lastAssistantMessage?.content.includes('primary audience')) {
    return "Thank you for that information. A few more questions:\n\n1. Should we include authentication examples?\n2. Are there any specific error scenarios that need detailed documentation?"
  }
  
  if (lastAssistantMessage?.content.includes('authentication examples')) {
    return "I understand. Feel free to ask any other questions, or click 'Generate Documentation' when you're ready to proceed."
  }
  
  return "I understand. Let me know if you have any other questions, or click 'Generate Documentation' when you're ready to proceed."
}