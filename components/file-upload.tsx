"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "@/lib/store/auth-store"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface FileUploadProps {
  currentFileUrl?: string
  onFileChange: (url: string | null) => void
  accept?: string
  maxSizeMB?: number
  folder?: string
  label?: string
}

export function FileUpload({
  currentFileUrl,
  onFileChange,
  accept = "image/*",
  maxSizeMB = 5,
  folder = "files",
  label = "Upload File"
}: FileUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFileUrl || null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userId = useAuthStore((state) => state.user?.id)
  const supabase = createClient()

  useEffect(() => {
    setPreviewUrl(currentFileUrl || null)
  }, [currentFileUrl])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    setUploading(true)

    try {
      // Delete old file if exists
      if (currentFileUrl) {
        const oldPath = currentFileUrl.split("/").slice(-2).join("/")
        await supabase.storage.from("uploads").remove([oldPath])
      }

      // Upload new file
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      // Get signed URL (bucket is private for security)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("uploads")
        .createSignedUrl(data.path, 60 * 60 * 24 * 365) // 1 year expiry

      if (signedError) throw signedError

      setPreviewUrl(signedData.signedUrl)
      onFileChange(signedData.signedUrl)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Upload error:", error)
      }
      toast.error("Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentFileUrl) return

    try {
      const path = currentFileUrl.split("/").slice(-2).join("/")
      await supabase.storage.from("uploads").remove([path])
      
      setPreviewUrl(null)
      onFileChange(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Remove error:", error)
    }
  }

  const handleClick = () => {
    if (!userId) {
      toast.error("Please sign in to upload files")
      return
    }
    fileInputRef.current?.click()
  }

  const isImage = accept.includes("image")

  return (
    <div className="space-y-2">
      {previewUrl && isImage ? (
        <div className="relative w-32 h-32 group">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : previewUrl ? (
        <div className="flex items-center gap-2 p-2 border rounded-lg">
          <span className="text-sm flex-1 truncate">{previewUrl.split("/").pop()}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {!previewUrl && (
        <Button
          type="button"
          variant="outline"
          className="w-32 h-32 border-2 border-dashed"
          onClick={handleClick}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              {isImage ? <ImageIcon className="h-6 w-6 text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
              <span className="text-xs text-center text-muted-foreground leading-tight">
                {userId ? label : "Sign in to upload"}
              </span>
            </div>
          )}
        </Button>
      )}
    </div>
  )
}
