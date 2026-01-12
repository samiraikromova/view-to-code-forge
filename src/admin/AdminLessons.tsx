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
import { Plus, Trash2, FolderPlus, Clock, FileText, Upload, X, File, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface Lesson {
  id: string
  title: string
  description: string
  vdocipher_id: string
  category: 'course' | 'call_recording'
  module: string
  duration: string
  duration_formatted: string
  thumbnail_url?: string
  transcript_text?: string
  access_type: 'free' | 'tier_required' | 'purchase_required' | 'unlock_required'
  required_tier?: string
  product_id?: string
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
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [moduleType, setModuleType] = useState<'course' | 'call_recording'>('course')
  const [newModuleName, setNewModuleName] = useState('')
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
    module: '',
    duration: '',
    thumbnail_url: '',
    transcript_text: '',
    access_type: 'free' as 'free' | 'tier_required' | 'purchase_required',
    required_tier: '',
    product_id: '',
    order_index: "0"
  })

  useEffect(() => {
    loadLessons()
  }, [])

  const loadLessons = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('course_videos')
      .select('*')
      .order('category', { ascending: true })
      .order('module', { ascending: true })
      .order('order_index', { ascending: true })

    if (error) {
      toast.error('Failed to load lessons')
    } else {
      setLessons(data || [])
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

    const payload = {
      title: formData.title,
      description: formData.description,
      vdocipher_id: formData.vdocipher_id || null,
      category: formData.category,
      module: formData.module,
      duration: formData.duration || null,
      thumbnail_url: formData.thumbnail_url || null,
      transcript_text: formData.transcript_text || null,
      access_type: formData.access_type,
      required_tier: formData.access_type === 'tier_required' ? formData.required_tier : null,
      product_id: formData.access_type === 'purchase_required' ? formData.product_id : null,
      order_index: Number(formData.order_index),
      files: uploadedFiles.length > 0 ? uploadedFiles : null
    }

    if (editingLessonId) {
      // Update existing lesson
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
      // Insert new lesson
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
    loadLessons()
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      vdocipher_id: '',
      category: 'course',
      module: '',
      duration: '',
      thumbnail_url: '',
      transcript_text: '',
      access_type: 'free',
      required_tier: '',
      product_id: '',
      order_index: "0"
    })
    setPendingFiles([])
    setExistingFiles([])
    setEditingLessonId(null)
  }

  const editLesson = (lesson: Lesson) => {
    // Map legacy unlock_required to purchase_required
    let accessType = lesson.access_type;
    if (accessType === 'unlock_required') {
      accessType = 'purchase_required';
    }
    
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      vdocipher_id: lesson.vdocipher_id || '',
      category: lesson.category,
      module: lesson.module || '',
      duration: lesson.duration || '',
      thumbnail_url: lesson.thumbnail_url || '',
      transcript_text: lesson.transcript_text || '',
      access_type: accessType as 'free' | 'tier_required' | 'purchase_required',
      required_tier: lesson.required_tier || '',
      product_id: lesson.product_id || '',
      order_index: String(lesson.order_index)
    })
    setExistingFiles(lesson.files || [])
    setPendingFiles([])
    setEditingLessonId(lesson.id)
    setShowModal(true)
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
      loadLessons()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPendingFiles(prev => [...prev, ...files])
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Get unique modules/months
  const courseModules = [...new Set(lessons.filter(v => v.category === 'course').map(v => v.module))].filter(Boolean)
  const callMonths = [...new Set(lessons.filter(v => v.category === 'call_recording').map(v => v.module))].filter(Boolean)

  const courseLessons = lessons.filter(v => v.category === 'course')
  const callRecordings = lessons.filter(v => v.category === 'call_recording')

  // Group lessons by module
  const groupByModule = (items: Lesson[]) => {
    const groups: { [key: string]: Lesson[] } = {}
    items.forEach(v => {
      const key = v.module || 'Uncategorized'
      if (!groups[key]) groups[key] = []
      groups[key].push(v)
    })
    return groups
  }

  const courseGroups = groupByModule(courseLessons)
  const callGroups = groupByModule(callRecordings)

  const openModuleModal = (type: 'course' | 'call_recording') => {
    setModuleType(type)
    setNewModuleName('')
    setShowModuleModal(true)
  }

  const formatDuration = (lesson: Lesson) => {
    if (lesson.duration_formatted) return lesson.duration_formatted
    if (lesson.duration) return lesson.duration
    return '-'
  }

  const getAccessBadge = (lesson: Lesson) => {
    switch (lesson.access_type) {
      case 'free':
        return <Badge variant="secondary" className="text-xs">Free</Badge>
      case 'tier_required':
        return <Badge variant="outline" className="text-xs">Tier: {lesson.required_tier}</Badge>
      case 'purchase_required':
        return <Badge className="text-xs bg-accent">Purchase</Badge>
      default:
        return null
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
              
              {Object.keys(courseGroups).length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
                  No course lessons yet
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(courseGroups).map(([moduleName, items]) => (
                    <div key={moduleName} className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border">
                        <h3 className="font-medium text-foreground">{moduleName}</h3>
                        <span className="text-xs text-muted-foreground">{items.length} lesson{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Access</TableHead>
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
                          {items.map((lesson) => (
                            <TableRow key={lesson.id}>
                              <TableCell className="font-medium">{lesson.title}</TableCell>
                              <TableCell>{getAccessBadge(lesson)}</TableCell>
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
              
              {Object.keys(callGroups).length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
                  No call recordings yet
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(callGroups).map(([monthName, items]) => (
                    <div key={monthName} className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border">
                        <h3 className="font-medium text-foreground">{monthName}</h3>
                        <span className="text-xs text-muted-foreground">{items.length} recording{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Access</TableHead>
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
                          {items.map((lesson) => (
                            <TableRow key={lesson.id}>
                              <TableCell className="font-medium">{lesson.title}</TableCell>
                              <TableCell>{getAccessBadge(lesson)}</TableCell>
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
                    onValueChange={(v) => setFormData({ ...formData, category: v as 'course' | 'call_recording', module: '' })}
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
                    value={formData.module}
                    onValueChange={(v) => setFormData({ ...formData, module: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={`Select ${formData.category === 'course' ? 'module' : 'month'}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.category === 'course' ? courseModules : callMonths).map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-2"
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    placeholder={formData.category === 'course' ? 'Or type new module name' : 'Or type new month'}
                  />
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

              {/* Access Control */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Access Type</Label>
                  <Select
                    value={formData.access_type}
                    onValueChange={(v) => setFormData({ ...formData, access_type: v as typeof formData.access_type })}
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

                {formData.access_type === 'tier_required' && (
                  <div>
                    <Label>Required Tier</Label>
                    <Input
                      className="mt-1"
                      value={formData.required_tier}
                      onChange={(e) => setFormData({ ...formData, required_tier: e.target.value })}
                      placeholder="e.g., pro, premium"
                    />
                  </div>
                )}

                {formData.access_type === 'purchase_required' && (
                  <div>
                    <Label>Product ID</Label>
                    <Input
                      className="mt-1"
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      placeholder="e.g., prod_abc123"
                    />
                  </div>
                )}
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
        <Dialog open={showModuleModal} onOpenChange={setShowModuleModal}>
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
              <p className="text-sm text-muted-foreground">
                {moduleType === 'course' 
                  ? 'This will create a new module. You can then add lessons to it.'
                  : 'This will create a new month period. You can then add call recordings to it.'}
              </p>
              <div className="flex gap-3">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    if (!newModuleName.trim()) {
                      toast.error('Please enter a name')
                      return
                    }
                    setShowModuleModal(false)
                    setShowModal(true)
                    setFormData(prev => ({
                      ...prev,
                      category: moduleType,
                      module: newModuleName.trim()
                    }))
                    toast.success(`${moduleType === 'course' ? 'Module' : 'Month'} created! Now add a lesson.`)
                  }}
                >
                  Create & Add Lesson
                </Button>
                <Button variant="outline" onClick={() => setShowModuleModal(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
