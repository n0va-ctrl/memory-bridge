"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, Heart, Brain, Trash2 } from "lucide-react"

export default function ConsentScreen() {
  const [shareWithCaregiver, setShareWithCaregiver] = useState(true)
  const [allowAIProcessing, setAllowAIProcessing] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "success" | "error">("idle")

  useEffect(() => {
    console.log("Consent updated:", { shareWithCaregiver, allowAIProcessing })
  }, [shareWithCaregiver, allowAIProcessing])

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch("/api/delete-data", { method: "POST" })
      if (res.ok) {
        setDeleteStatus("success")
        setShowDeleteModal(false)
      } else {
        setDeleteStatus("error")
        setShowDeleteModal(false)
      }
    } catch {
      setDeleteStatus("error")
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 md:mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground">
            Your Privacy
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            You are always in control of your data.
          </p>
        </header>

        {deleteStatus === "success" && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-sm text-center">
            All your data has been deleted successfully.
          </div>
        )}
        {deleteStatus === "error" && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-destructive text-sm text-center">
            Something went wrong. Please try again.
          </div>
        )}

        <Card className="mb-6 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-xl text-foreground">Privacy Settings</CardTitle>
            <CardDescription className="text-sm md:text-base text-muted-foreground">
              Choose how Companion uses your information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="caregiver-toggle"
                    className="cursor-pointer text-base md:text-lg font-semibold text-foreground"
                  >
                    Share insights with my caregiver
                  </label>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Your weekly mood summary will be visible to your designated caregiver.
                  </p>
                </div>
              </div>
              <Switch
                id="caregiver-toggle"
                checked={shareWithCaregiver}
                onCheckedChange={setShareWithCaregiver}
                className="mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="ai-toggle"
                    className="cursor-pointer text-base md:text-lg font-semibold text-foreground"
                  >
                    Allow AI to learn from our conversations
                  </label>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Helps Companion remember your preferences and improve responses over time.
                  </p>
                </div>
              </div>
              <Switch
                id="ai-toggle"
                checked={allowAIProcessing}
                onCheckedChange={setAllowAIProcessing}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-foreground">
              <Trash2 className="h-5 w-5 text-destructive" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <h3 className="mb-1 text-base md:text-lg font-semibold text-foreground">
                Delete My Data
              </h3>
              <p className="mb-4 text-sm md:text-base text-muted-foreground leading-relaxed">
                Permanently removes all your conversations and memories from our system. This cannot be undone.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Delete My Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center text-xl text-foreground">
                Are you sure?
              </DialogTitle>
              <DialogDescription className="text-center text-base text-muted-foreground">
                This will permanently delete all your data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="order-2 w-full sm:order-1 sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="order-1 w-full sm:order-2 sm:w-auto"
              >
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}