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
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Video {
  id: string
  title: string
  description: string
  vdocipher_id: string
  category: 'course' | 'call_recording'
  module: string
  duration: string
  thumbnail_url?: string
  order_index: number
}

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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

  const courseVideos = videos.filter(v => v.category === 'course')
  const callRecordings = videos.filter(v => v.category === 'call_recording')

  return (
    <AdminLayout currentPage="videos">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Video Management</h1>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Video
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
              <h2 className="text-lg font-semibold mb-4 text-foreground">📚 Course Videos</h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Title</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>VdoCipher ID</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseVideos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          No course videos
                        </TableCell>
                      </TableRow>
                    ) : (
                      courseVideos.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell className="font-medium">{video.title}</TableCell>
                          <TableCell className="text-muted-foreground">{video.module}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {video.vdocipher_id.substring(0, 12)}...
                          </TableCell>
                          <TableCell>{video.duration}</TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Call Recordings */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-foreground">📞 Call Recordings</h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Title</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>VdoCipher ID</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callRecordings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          No call recordings
                        </TableCell>
                      </TableRow>
                    ) : (
                      callRecordings.map((video) => (
                        <TableRow key={video.id}>
                          <TableCell className="font-medium">{video.title}</TableCell>
                          <TableCell className="text-muted-foreground">{video.module}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {video.vdocipher_id.substring(0, 12)}...
                          </TableCell>
                          <TableCell>{video.duration}</TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Add Video Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Video</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as 'course' | 'call_recording' })}
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

              <div>
                <Label>{formData.category === 'course' ? 'Module' : 'Period'}</Label>
                <Input
                  className="mt-1"
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  placeholder={formData.category === 'course' ? 'e.g., Module 1: Foundations' : 'e.g., January 2025'}
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

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1">Add Video</Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
