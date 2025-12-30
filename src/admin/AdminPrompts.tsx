import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from './AdminLayout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
  slug: string
  system_prompt: string
  description: string
}

export default function AdminPrompts() {
  const [projects, setProjects] = useState<Project[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('projects').select('*').order('name')
    if (error) {
      toast.error('Failed to load projects')
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  const savePrompt = async (id: string, prompt: string) => {
    setSaving(true)
    const { error } = await supabase.from('projects').update({ system_prompt: prompt }).eq('id', id)
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('System prompt saved')
      setEditing(null)
      loadProjects()
    }
    setSaving(false)
  }

  return (
    <AdminLayout currentPage="prompts">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Edit System Prompts</h1>
          <p className="text-muted-foreground">Customize how each AI assistant behaves and responds</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription>{p.description}</CardDescription>
                    </div>
                    {editing !== p.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(p.id)}
                        className="text-primary hover:text-primary"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {editing === p.id ? (
                    <>
                      <Textarea
                        className="mb-3"
                        rows={8}
                        defaultValue={p.system_prompt}
                        id={`prompt-${p.id}`}
                        placeholder="Enter system prompt..."
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const textarea = document.getElementById(`prompt-${p.id}`) as HTMLTextAreaElement
                            savePrompt(p.id, textarea.value)
                          }}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {p.system_prompt}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
