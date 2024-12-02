import { DocGenerationForm } from '@/components/doc-generation-form'

export default function DocumentationPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">API Documentation Generator</h1>
      <DocGenerationForm />
    </div>
  )
} 