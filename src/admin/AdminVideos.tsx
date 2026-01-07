import { useEffect, useState } from "react"
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
import { Plus, Trash2, FolderPlus, Clock } from "lucide-react"
import { toast } from "sonner"

interface Video {
  id: string
  title: string
  description: string
  vdocipher_id: string
  category: 'course' | 'call_recording'
  module: string
  duration: string
  duration_formatted: string
  thumbnail_url?: string
  order_index: number
}

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [moduleType, setModuleType] = useState<'course' | 'call_recording'>('course')
  const [newModuleName, setNewModuleName] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vdocipher_id: '',
    category: 'course' as 'course' | 'call_recording',
    module: '',
    duration: '',
    thumbnail_url: '',
    order_index: "0"
  })

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('course_videos')
      .select('*')
      .order('category', { ascending: true })
      .order('module', { ascending: true })
      .order('order_index', { ascending: true })

    if (error) {
      toast.error('Failed to load videos')
    } else {
      setVideos(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      ...formData,
      order_index: Number(formData.order_index)
    }

    const { error } = await supabase
      .from('course_videos')
      .insert([payload])

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Video added')
      setShowModal(false)
      setFormData({
        title: '',
        description: '',
        vdocipher_id: '',
        category: 'course',
        module: '',
        duration: '',
        thumbnail_url: '',
        order_index: "0"
      })
      loadVideos()
    }
  }

  const deleteVideo = async (id: string) => {
    if (!confirm('Delete this video?')) return

    const { error } = await supabase
      .from('course_videos')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Video deleted')
      loadVideos()
    }
  }

  // Get unique modules/months
  const courseModules = [...new Set(videos.filter(v => v.category === 'course').map(v => v.module))].filter(Boolean)
  const callMonths = [...new Set(videos.filter(v => v.category === 'call_recording').map(v => v.module))].filter(Boolean)

  const courseVideos = videos.filter(v => v.category === 'course')
  const callRecordings = videos.filter(v => v.category === 'call_recording')

  // Group videos by module
  const groupByModule = (vids: Video[]) => {
    const groups: { [key: string]: Video[] } = {}
    vids.forEach(v => {
      const key = v.module || 'Uncategorized'
      if (!groups[key]) groups[key] = []
      groups[key].push(v)
    })
    return groups
  }

  const courseGroups = groupByModule(courseVideos)
  const callGroups = groupByModule(callRecordings)

  const openModuleModal = (type: 'course' | 'call_recording') => {
    setModuleType(type)
    setNewModuleName('')
    setShowModuleModal(true)
  }

  const formatDuration = (video: Video) => {
    if (video.duration_formatted) return video.duration_formatted
    if (video.duration) return video.duration
    return '-'
  }

  return (
    <AdminLayout currentPage="videos">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Video Management</h1>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p>Loading videos...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Course Videos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">📚 Course Videos</h2>
                <Button variant="outline" size="sm" onClick={() => openModuleModal('course')}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Module
                </Button>
              </div>
              
              {Object.keys(courseGroups).length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
                  No course videos yet
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(courseGroups).map(([moduleName, vids]) => (
                    <div key={moduleName} className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border">
                        <h3 className="font-medium text-foreground">{moduleName}</h3>
                        <span className="text-xs text-muted-foreground">{vids.length} video{vids.length !== 1 ? 's' : ''}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>VdoCipher ID</TableHead>
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
                          {vids.map((video) => (
                            <TableRow key={video.id}>
                              <TableCell className="font-medium">{video.title}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {video.vdocipher_id?.substring(0, 12)}...
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatDuration(video)}</TableCell>
                              <TableCell>{video.order_index}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteVideo(video.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                  {Object.entries(callGroups).map(([monthName, vids]) => (
                    <div key={monthName} className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border">
                        <h3 className="font-medium text-foreground">{monthName}</h3>
                        <span className="text-xs text-muted-foreground">{vids.length} recording{vids.length !== 1 ? 's' : ''}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>VdoCipher ID</TableHead>
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
                          {vids.map((video) => (
                            <TableRow key={video.id}>
                              <TableCell className="font-medium">{video.title}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {video.vdocipher_id?.substring(0, 12)}...
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatDuration(video)}</TableCell>
                              <TableCell>{video.order_index}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteVideo(video.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lesson</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    <SelectItem value="course">📚 Course Video</SelectItem>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Or type a new one below
                </p>
                <Input
                  className="mt-2"
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  placeholder={formData.category === 'course' ? 'e.g., Module 1: Foundations' : 'e.g., January 2025'}
                />
              </div>

              <div>
                <Label>Title</Label>
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
                <Label>VdoCipher Video ID</Label>
                <Input
                  className="mt-1 font-mono"
                  value={formData.vdocipher_id}
                  onChange={(e) => setFormData({ ...formData, vdocipher_id: e.target.value })}
                  placeholder="e.g., 5f8d9e3c4b2a1d6e7f8a9b0c"
                  required
                />
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

              <div>
                <Label>Lesson Files (optional)</Label>
                <Input
                  type="file"
                  multiple
                  className="mt-1"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PDFs, documents, images, etc.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">Add Lesson</Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
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
                  ? 'This will create a new module. You can then add videos to it.'
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
                    toast.success(`${moduleType === 'course' ? 'Module' : 'Month'} created! Now add a video.`)
                  }}
                >
                  Create & Add Video
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
