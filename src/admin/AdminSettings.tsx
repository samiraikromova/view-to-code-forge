import { useState } from "react"
import { AdminLayout } from "./AdminLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Save } from "lucide-react"

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewSignups: true,
    defaultCredits: 100,
    creditPricePerUnit: 0.10
  })

  const handleSave = () => {
    // In a real app, this would save to a settings table in Supabase
    toast.success('Settings saved successfully')
  }

  return (
    <AdminLayout currentPage="settings">
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-foreground">General Settings</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure general application behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Disable access for non-admin users
                  </p>
                </div>
                <Switch 
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Allow New Signups</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable new user registration
                  </p>
                </div>
                <Switch 
                  checked={settings.allowNewSignups}
                  onCheckedChange={(checked) => setSettings({...settings, allowNewSignups: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Credit Settings */}
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Credit Settings</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure credit allocation and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultCredits" className="text-foreground">Default Credits for New Users</Label>
                <Input
                  id="defaultCredits"
                  type="number"
                  value={settings.defaultCredits}
                  onChange={(e) => setSettings({...settings, defaultCredits: parseInt(e.target.value) || 0})}
                  className="bg-background border-border text-foreground max-w-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditPrice" className="text-foreground">Credit Price ($ per credit)</Label>
                <Input
                  id="creditPrice"
                  type="number"
                  step="0.01"
                  value={settings.creditPricePerUnit}
                  onChange={(e) => setSettings({...settings, creditPricePerUnit: parseFloat(e.target.value) || 0})}
                  className="bg-background border-border text-foreground max-w-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Webhook URLs */}
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Webhook Configuration</CardTitle>
              <CardDescription className="text-muted-foreground">
                n8n webhook endpoints (read-only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Chat Webhook</Label>
                <Input
                  value="https://n8n.leveragedcreator.ai/webhook/cb4-chat"
                  readOnly
                  className="bg-muted border-border text-muted-foreground font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Image Generation Webhook</Label>
                <Input
                  value="https://n8n.leveragedcreator.ai/webhook/generate-image"
                  readOnly
                  className="bg-muted border-border text-muted-foreground font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
