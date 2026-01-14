import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { AdminLayout } from "./AdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, FolderPlus, Clock, FileText, Upload, X, File, Pencil, Settings } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Module {
  id: string
  name: string
  category: 'course' | 'call_recording'
  access_type: 'free' | 'tier_required' | 'purchase_required'
  required_tier?: string
  fanbases_product_id?: string
  order_index: number
}

interface Lesson {
  id: string
  title: string
  description: string
  vdocipher_id: string
  category: 'course' | 'call_recording'
  module: string // Legacy field
  module_id: string | null // Foreign key to modules table
  duration: string
  duration_formatted: string
  thumbnail_url?: string
  transcript_text?: string
  order_index: number
  files?: LessonFileItem[]
}

interface LessonFileItem {
  name: string
  url: string
  type: string
  size?: number
}

export default function AdminLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showEditModuleModal, setShowEditModuleModal] = useState(false)
  const [moduleType, setModuleType] = useState<'course' | 'call_recording'>('course')
  const [newModuleName, setNewModuleName] = useState('')
  const [newModuleAccessType, setNewModuleAccessType] = useState<'free' | 'tier_required' | 'purchase_required'>('free')
  const [newModuleRequiredTier, setNewModuleRequiredTier] = useState('')
  const [newModuleFanbasesId, setNewModuleFanbasesId] = useState('')
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [existingFiles, setExistingFiles] = useState<LessonFileItem[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vdocipher_id: '',
    category: 'course' as 'course' | 'call_recording',
    module_id: '', // Use module_id instead of module name
    duration: '',
    thumbnail_url: '',
    transcript_text: '',
    order_index: "0"
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Load modules and lessons in parallel
    const [modulesResult, lessonsResult] = await Promise.all([
      supabase.from('modules').select('*').order('category').order('order_index'),
      supabase.from('course_videos').select('*').order('category').order('module').order('order_index')
    ])

    if (modulesResult.error) {
      toast.error('Failed to load modules')
    } else {
      setModules(modulesResult.data || [])
    }

    if (lessonsResult.error) {
      toast.error('Failed to load lessons')
    } else {
      setLessons(lessonsResult.data || [])
    }
    
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Upload pending files first and collect their URLs
    const uploadedFiles: LessonFileItem[] = [...existingFiles]
    
    if (pendingFiles.length > 0) {
      setUploadingFiles(true)
      for (const file of pendingFiles) {
        const filePath = `${Date.now()}_${file.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('lesson-files')
          .upload(filePath, file)

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`)
          setUploadingFiles(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('lesson-files')
          .getPublicUrl(filePath)

        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size
        })
      }
      setUploadingFiles(false)
    }

    // Find the selected module to get its name for legacy field
    const selectedModule = modules.find(m => m.id === formData.module_id)
    
    const payload = {
      title: formData.title,
      description: formData.description,
      vdocipher_id: formData.vdocipher_id || null,
      category: formData.category,
      module_id: formData.module_id || null, // Foreign key
      module: selectedModule?.name || '', // Legacy field for backward compatibility
      duration: formData.duration || null,
      thumbnail_url: formData.thumbnail_url || null,
      transcript_text: formData.transcript_text || null,
      order_index: Number(formData.order_index),
      files: uploadedFiles.length > 0 ? uploadedFiles : null
    }

    if (editingLessonId) {
      const { error } = await supabase
        .from('course_videos')
        .update(payload)
        .eq('id', editingLessonId)

      if (error) {
        toast.error('Error: ' + error.message)
        return
      }

      toast.success('Lesson updated')
    } else {
      const { error } = await supabase
        .from('course_videos')
        .insert([payload])

      if (error) {
        toast.error('Error: ' + error.message)
        return
      }

      toast.success('Lesson added')
    }

    setShowModal(false)
    resetForm()
    loadData()
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      vdocipher_id: '',
      category: 'course',
      module_id: '',
      duration: '',
      thumbnail_url: '',
      transcript_text: '',
      order_index: "0"
    })
    setPendingFiles([])
    setExistingFiles([])
    setEditingLessonId(null)
  }

  const resetModuleForm = () => {
    setNewModuleName('')
    setNewModuleAccessType('free')
    setNewModuleRequiredTier('')
    setNewModuleFanbasesId('')
    setEditingModule(null)
  }

  const editLesson = (lesson: Lesson) => {
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      vdocipher_id: lesson.vdocipher_id || '',
      category: lesson.category,
      module_id: lesson.module_id || '',
      duration: lesson.duration || '',
      thumbnail_url: lesson.thumbnail_url || '',
      transcript_text: lesson.transcript_text || '',
      order_index: String(lesson.order_index)
    })
    setExistingFiles(lesson.files || [])
    setPendingFiles([])
    setEditingLessonId(lesson.id)
    setShowModal(true)
  }

  const openEditModuleModal = (module: Module) => {
    setEditingModule(module)
    setNewModuleName(module.name)
    setNewModuleAccessType(module.access_type)
    setNewModuleRequiredTier(module.required_tier || '')
    setNewModuleFanbasesId(module.fanbases_product_id || '')
    setModuleType(module.category)
    setShowEditModuleModal(true)
  }

  const handleSaveModule = async () => {
    if (!editingModule) return
    if (!newModuleName.trim()) {
      toast.error('Please enter a module name')
      return
    }

    const payload: Partial<Module> = {
      name: newModuleName.trim(),
      access_type: newModuleAccessType,
      required_tier: newModuleAccessType === 'tier_required' ? newModuleRequiredTier : null,
      fanbases_product_id: newModuleAccessType === 'purchase_required' ? newModuleFanbasesId : null
    }

    // Update module
    const { error: moduleError } = await supabase
      .from('modules')
      .update(payload)
      .eq('id', editingModule.id)

    if (moduleError) {
      toast.error('Failed to update module: ' + moduleError.message)
      return
    }

    // Update all lessons in this module to use new name if changed (for legacy field)
    if (editingModule.name !== newModuleName.trim()) {
      const { error: lessonsError } = await supabase
        .from('course_videos')
        .update({ module: newModuleName.trim() })
        .eq('module_id', editingModule.id)

      if (lessonsError) {
        toast.error('Failed to update lessons: ' + lessonsError.message)
        return
      }
    }

    toast.success('Module updated')
    setShowEditModuleModal(false)
    resetModuleForm()
    loadData()
  }

  const handleDeleteModule = async (module: Module) => {
    const lessonsInModule = lessons.filter(l => l.module_id === module.id)
    
    if (lessonsInModule.length > 0) {
      if (!confirm(`This module contains ${lessonsInModule.length} lesson(s). Delete all lessons and the module?`)) {
        return
      }
      
      // Delete all lessons in this module
      for (const lesson of lessonsInModule) {
        if (lesson.files) {
          for (const file of lesson.files) {
            const pathParts = file.url.split('/lesson-files/')
            if (pathParts[1]) {
              await supabase.storage.from('lesson-files').remove([pathParts[1]])
            }
          }
        }
      }

      const { error: lessonsError } = await supabase
        .from('course_videos')
        .delete()
        .eq('module_id', module.id)

      if (lessonsError) {
        toast.error('Failed to delete lessons: ' + lessonsError.message)
        return
      }
    } else {
      if (!confirm('Delete this empty module?')) return
    }

    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', module.id)

    if (error) {
      toast.error('Failed to delete module: ' + error.message)
    } else {
      toast.success('Module deleted')
      loadData()
    }
  }

  const handleCreateModule = async () => {
    if (!newModuleName.trim()) {
      toast.error('Please enter a name')
      return
    }

    const payload = {
      name: newModuleName.trim(),
      category: moduleType,
      access_type: newModuleAccessType,
      required_tier: newModuleAccessType === 'tier_required' ? newModuleRequiredTier : null,
      fanbases_product_id: newModuleAccessType === 'purchase_required' ? newModuleFanbasesId : null,
      order_index: modules.filter(m => m.category === moduleType).length
    }

    const { error } = await supabase.from('modules').insert([payload])

    if (error) {
      toast.error('Failed to create module: ' + error.message)
      return
    }

    toast.success(`${moduleType === 'course' ? 'Module' : 'Month'} created!`)
    setShowModuleModal(false)
    resetModuleForm()
    loadData()
  }

  const removeExistingFile = async (index: number) => {
    const file = existingFiles[index]
    // Extract path from URL and remove from storage
    const pathParts = file.url.split('/lesson-files/')
    if (pathParts[1]) {
      await supabase.storage.from('lesson-files').remove([pathParts[1]])
    }
    setExistingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const deleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson and all its files?')) return

    // Find the lesson and delete its files from storage
    const lesson = lessons.find(l => l.id === id)
    if (lesson?.files) {
      for (const file of lesson.files) {
        const pathParts = file.url.split('/lesson-files/')
        if (pathParts[1]) {
          await supabase.storage.from('lesson-files').remove([pathParts[1]])
        }
      }
    }

    const { error } = await supabase
      .from('course_videos')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Lesson deleted')
      loadData()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPendingFiles(prev => [...prev, ...files])
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Get modules for dropdowns (use id instead of name)
  const courseModules = modules.filter(m => m.category === 'course')
  const callModules = modules.filter(m => m.category === 'call_recording')

  const courseLessons = lessons.filter(v => v.category === 'course')
  const callRecordings = lessons.filter(v => v.category === 'call_recording')

  // Get modules with their lessons (using module_id)
  const courseModulesWithLessons = modules
    .filter(m => m.category === 'course')
    .map(m => ({
      ...m,
      lessons: lessons.filter(l => l.module_id === m.id)
    }))

  const callModulesWithLessons = modules
    .filter(m => m.category === 'call_recording')
    .map(m => ({
      ...m,
      lessons: lessons.filter(l => l.module_id === m.id)
    }))

  const openModuleModal = (type: 'course' | 'call_recording') => {
    setModuleType(type)
    resetModuleForm()
    setShowModuleModal(true)
  }

  const formatDuration = (lesson: Lesson) => {
    if (lesson.duration_formatted) return lesson.duration_formatted
    if (lesson.duration) return lesson.duration
    return '-'
  }

  const getModuleAccessBadge = (module: Module) => {
    switch (module.access_type) {
      case 'free':
        return <Badge variant="secondary" className="text-xs">🆓 Free</Badge>
      case 'tier_required':
        return <Badge variant="outline" className="text-xs">🎖️ {module.required_tier}</Badge>
      case 'purchase_required':
        return <Badge className="text-xs bg-accent">💳 Purchase</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">🆓 Free</Badge>
    }
  }

  return (
    <AdminLayout currentPage="lessons">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Lesson Management</h1>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p>Loading lessons...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">📚 Classroom Modules</h2>
                <Button variant="outline" size="sm" onClick={() => openModuleModal('course')}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Module
                </Button>
              </div>
              
              {courseModulesWithLessons.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
                  No modules yet. Create a module to add lessons.
                </div>
              ) : (
                <div className="space-y-4">
                  {courseModulesWithLessons.map((module) => (
                    <div key={module.id} className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{module.name}</h3>
                            {getModuleAccessBadge(module)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''}
                            {module.fanbases_product_id && <span className="ml-2">• Fanbases ID: {module.fanbases_product_id}</span>}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModuleModal(module)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteModule(module)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {module.lessons.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No lessons in this module yet
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Transcript
                                </div>
                              </TableHead>
                              <TableHead>Files</TableHead>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Duration
                                </div>
                              </TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {module.lessons.map((lesson) => (
                              <TableRow key={lesson.id}>
                                <TableCell className="font-medium">{lesson.title}</TableCell>
                                <TableCell>
                                  {lesson.transcript_text ? (
                                    <Badge variant="secondary" className="text-xs">Yes</Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {lesson.files?.length ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {lesson.files.length} file{lesson.files.length !== 1 ? 's' : ''}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{formatDuration(lesson)}</TableCell>
                                <TableCell>{lesson.order_index}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => editLesson(lesson)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteLesson(lesson.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Call Recordings */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">📞 Call Recordings</h2>
                <Button variant="outline" size="sm" onClick={() => openModuleModal('call_recording')}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Month
                </Button>
              </div>
              
              {callModulesWithLessons.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
                  No months yet. Create a month to add recordings.
                </div>
              ) : (
                <div className="space-y-4">
                  {callModulesWithLessons.map((module) => (
                    <div key={module.id} className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{module.name}</h3>
                            {getModuleAccessBadge(module)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {module.lessons.length} recording{module.lessons.length !== 1 ? 's' : ''}
                            {module.fanbases_product_id && <span className="ml-2">• Fanbases ID: {module.fanbases_product_id}</span>}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModuleModal(module)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteModule(module)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {module.lessons.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No recordings in this month yet
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Transcript
                                </div>
                              </TableHead>
                              <TableHead>Files</TableHead>
                              <TableHead>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Duration
                                </div>
                              </TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {module.lessons.map((lesson) => (
                              <TableRow key={lesson.id}>
                                <TableCell className="font-medium">{lesson.title}</TableCell>
                                <TableCell>
                                  {lesson.transcript_text ? (
                                    <Badge variant="secondary" className="text-xs">Yes</Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {lesson.files?.length ? (
                                    <Badge variant="secondary" className="text-xs">
                                      {lesson.files.length} file{lesson.files.length !== 1 ? 's' : ''}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{formatDuration(lesson)}</TableCell>
                                <TableCell>{lesson.order_index}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => editLesson(lesson)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteLesson(lesson.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                      </Table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Lesson Modal */}
        <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as 'course' | 'call_recording', module_id: '' })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course">📚 Course Lesson</SelectItem>
                      <SelectItem value="call_recording">📞 Call Recording</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{formData.category === 'course' ? 'Module' : 'Month'}</Label>
                  <Select
                    value={formData.module_id}
                    onValueChange={(v) => setFormData({ ...formData, module_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={`Select ${formData.category === 'course' ? 'module' : 'month'}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.category === 'course' ? courseModules : callModules).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create modules using the "New Module" button first
                  </p>
                </div>
              </div>

              <div>
                <Label>Title *</Label>
                <Input
                  className="mt-1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  className="mt-1"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>VdoCipher Video ID (optional)</Label>
                <Input
                  className="mt-1 font-mono"
                  value={formData.vdocipher_id}
                  onChange={(e) => setFormData({ ...formData, vdocipher_id: e.target.value })}
                  placeholder="e.g., 5f8d9e3c4b2a1d6e7f8a9b0c"
                />
              </div>

              {/* Transcript Field */}
              <div>
                <Label>Transcript Text</Label>
                <Textarea
                  className="mt-1 font-mono text-sm"
                  value={formData.transcript_text}
                  onChange={(e) => setFormData({ ...formData, transcript_text: e.target.value })}
                  rows={6}
                  placeholder="Paste the lesson transcript here..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be used for AI context and downloadable transcripts
                </p>
              </div>


              {/* File Uploads */}
              <div>
                <Label>Downloadable Files</Label>
                <div className="mt-2 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Files (PDFs, guides, images, etc.)
                  </Button>

                  {/* Existing Files (when editing) */}
                  {existingFiles.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-xs text-muted-foreground">Existing Files</Label>
                      {existingFiles.map((file, index) => (
                        <div key={`existing-${index}`} className="flex items-center gap-2 p-2 bg-accent/20 rounded-lg border border-accent/30">
                          <File className="h-4 w-4 text-accent" />
                          <span className="flex-1 text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Saved'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExistingFile(index)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending Files (new uploads) */}
                  {pendingFiles.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-xs text-muted-foreground">New Files (to be uploaded)</Label>
                      {pendingFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePendingFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration</Label>
                  <Input
                    className="mt-1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 45:32"
                  />
                </div>
                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Thumbnail URL (optional)</Label>
                <Input
                  className="mt-1"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={uploadingFiles}>
                  {uploadingFiles ? 'Uploading files...' : editingLessonId ? 'Save Changes' : 'Add Lesson'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Module/Month Modal */}
        <Dialog open={showModuleModal} onOpenChange={(open) => { setShowModuleModal(open); if (!open) resetModuleForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {moduleType === 'course' ? 'Create New Module' : 'Create New Month'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{moduleType === 'course' ? 'Module Name' : 'Month Name'}</Label>
                <Input
                  className="mt-1"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder={moduleType === 'course' ? 'e.g., Module 3: Advanced Topics' : 'e.g., February 2025'}
                />
              </div>

              <div>
                <Label>Access Type</Label>
                <Select
                  value={newModuleAccessType}
                  onValueChange={(v) => setNewModuleAccessType(v as typeof newModuleAccessType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">🆓 Free</SelectItem>
                    <SelectItem value="tier_required">🎖️ Tier Required</SelectItem>
                    <SelectItem value="purchase_required">💳 Purchase Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newModuleAccessType === 'tier_required' && (
                <div>
                  <Label>Required Tier</Label>
                  <Input
                    className="mt-1"
                    value={newModuleRequiredTier}
                    onChange={(e) => setNewModuleRequiredTier(e.target.value)}
                    placeholder="e.g., tier1, tier2"
                  />
                </div>
              )}

              {newModuleAccessType === 'purchase_required' && (
                <div>
                  <Label>Fanbases Product ID</Label>
                  <Input
                    className="mt-1"
                    value={newModuleFanbasesId}
                    onChange={(e) => setNewModuleFanbasesId(e.target.value)}
                    placeholder="e.g., abc123"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleCreateModule}>
                  Create {moduleType === 'course' ? 'Module' : 'Month'}
                </Button>
                <Button variant="outline" onClick={() => { setShowModuleModal(false); resetModuleForm(); }}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Module Modal */}
        <Dialog open={showEditModuleModal} onOpenChange={(open) => { setShowEditModuleModal(open); if (!open) resetModuleForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Edit {editingModule?.category === 'course' ? 'Module' : 'Month'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{editingModule?.category === 'course' ? 'Module Name' : 'Month Name'}</Label>
                <Input
                  className="mt-1"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder={editingModule?.category === 'course' ? 'e.g., Module 3: Advanced Topics' : 'e.g., February 2025'}
                />
              </div>

              <div>
                <Label>Access Type</Label>
                <Select
                  value={newModuleAccessType}
                  onValueChange={(v) => setNewModuleAccessType(v as typeof newModuleAccessType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">🆓 Free</SelectItem>
                    <SelectItem value="tier_required">🎖️ Tier Required</SelectItem>
                    <SelectItem value="purchase_required">💳 Purchase Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newModuleAccessType === 'tier_required' && (
                <div>
                  <Label>Required Tier</Label>
                  <Input
                    className="mt-1"
                    value={newModuleRequiredTier}
                    onChange={(e) => setNewModuleRequiredTier(e.target.value)}
                    placeholder="e.g., tier1, tier2"
                  />
                </div>
              )}

              {newModuleAccessType === 'purchase_required' && (
                <div>
                  <Label>Fanbases Product ID</Label>
                  <Input
                    className="mt-1"
                    value={newModuleFanbasesId}
                    onChange={(e) => setNewModuleFanbasesId(e.target.value)}
                    placeholder="e.g., abc123"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleSaveModule}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => { setShowEditModuleModal(false); resetModuleForm(); }}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
