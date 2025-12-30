import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { AdminLayout } from "./AdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  description: string
  system_prompt: string
  requires_tier2: boolean
  coming_soon: boolean
  is_active: boolean
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState({
    name: '',
    slug: '',
    icon: '🤖',
    color: '#d97757',
    description: '',
    system_prompt: 'You are a helpful AI assistant.',
    requires_tier2: false
  })

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      toast.error('Failed to load projects')
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startEdit = (project: Project) => {
    setEditingProject({...project})
    setShowEditModal(true)
  }

  const updateProject = async () => {
    if (!editingProject?.name || !editingProject?.slug) {
      toast.error('Name and slug are required')
      return
    }

    const { error } = await supabase
      .from('projects')
      .update({
        name: editingProject.name,
        slug: editingProject.slug,
        icon: editingProject.icon,
        color: editingProject.color,
        description: editingProject.description,
        system_prompt: editingProject.system_prompt,
        requires_tier2: editingProject.requires_tier2
      })
      .eq('id', editingProject.id)

    if (error) {
      toast.error('Error updating project: ' + error.message)
    } else {
      toast.success('Project updated')
      setShowEditModal(false)
      setEditingProject(null)
      load()
    }
  }

  const toggleComingSoon = async (id: string, comingSoon: boolean) => {
    const { error } = await supabase.from('projects').update({ coming_soon: comingSoon }).eq('id', id)
    if (error) {
      toast.error('Failed to update')
    } else {
      load()
    }
  }

  const createProject = async () => {
    if (!newProject.name || !newProject.slug) {
      toast.error('Name and slug are required')
      return
    }

    const { error } = await supabase.from('projects').insert({
      name: newProject.name,
      slug: newProject.slug,
      icon: newProject.icon,
      color: newProject.color,
      description: newProject.description,
      system_prompt: newProject.system_prompt,
      is_active: true,
      coming_soon: false,
      requires_tier2: newProject.requires_tier2
    })

    if (error) {
      toast.error('Error creating project: ' + error.message)
    } else {
      toast.success('Project created')
      setShowNewModal(false)
      setNewProject({
        name: '',
        slug: '',
        icon: '🤖',
        color: '#d97757',
        description: '',
        system_prompt: 'You are a helpful AI assistant.',
        requires_tier2: false
      })
      load()
    }
  }

  const deleteProject = async (id: string) => {
    if (confirm('Delete project?')) {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) {
        toast.error('Failed to delete')
      } else {
        toast.success('Project deleted')
        load()
      }
    }
  }

  return (
    <AdminLayout currentPage="projects">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Manage Projects</h1>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
                <span className="text-xl">{p.icon}</span>
                <span className="flex-1 font-medium text-foreground">{p.name}</span>
                {p.requires_tier2 && (
                  <Badge variant="secondary">Tier 2</Badge>
                )}
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={p.coming_soon}
                    onCheckedChange={(checked) => toggleComingSoon(p.id, checked as boolean)}
                  />
                  Coming Soon
                </label>
                <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteProject(p.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* New Project Modal */}
        <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Project Name</Label>
                <Input
                  className="mt-1"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  placeholder="Project Name"
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  className="mt-1"
                  value={newProject.slug}
                  onChange={(e) => setNewProject({...newProject, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  placeholder="project-slug"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon (emoji)</Label>
                  <Input
                    className="mt-1"
                    value={newProject.icon}
                    onChange={(e) => setNewProject({...newProject, icon: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input
                    className="mt-1"
                    value={newProject.color}
                    onChange={(e) => setNewProject({...newProject, color: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                />
              </div>
              <div>
                <Label>System Prompt</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={newProject.system_prompt}
                  onChange={(e) => setNewProject({...newProject, system_prompt: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tier2"
                  checked={newProject.requires_tier2}
                  onCheckedChange={(checked) => setNewProject({...newProject, requires_tier2: checked as boolean})}
                />
                <Label htmlFor="tier2">Requires Tier 2 subscription</Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={createProject} className="flex-1">Create</Button>
                <Button variant="outline" onClick={() => setShowNewModal(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Project Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-4">
                <div>
                  <Label>Project Name</Label>
                  <Input
                    className="mt-1"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    className="mt-1"
                    value={editingProject.slug}
                    onChange={(e) => setEditingProject({...editingProject, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Icon (emoji)</Label>
                    <Input
                      className="mt-1"
                      value={editingProject.icon}
                      onChange={(e) => setEditingProject({...editingProject, icon: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input
                      className="mt-1"
                      value={editingProject.color}
                      onChange={(e) => setEditingProject({...editingProject, color: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
                  />
                </div>
                <div>
                  <Label>System Prompt</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={editingProject.system_prompt || ''}
                    onChange={(e) => setEditingProject({...editingProject, system_prompt: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="tier2-edit"
                    checked={editingProject.requires_tier2}
                    onCheckedChange={(checked) => setEditingProject({...editingProject, requires_tier2: checked as boolean})}
                  />
                  <Label htmlFor="tier2-edit">Requires Tier 2 subscription</Label>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={updateProject} className="flex-1">Update</Button>
                  <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingProject(null); }} className="flex-1">Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
