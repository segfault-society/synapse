"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { FileUpload } from "@/components/file-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useItems } from "@/hooks/use-items"
import { useAuthStore } from "@/lib/store/auth-store"
import { Plus, Trash2, Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"

interface ItemsListProps {
  onSignInClick?: () => void
}

export function ItemsList({ onSignInClick }: ItemsListProps) {
  const { items, loading, createItem, updateItem, deleteItem } = useItems()
  const { isSignedIn, isInitialized } = useAuthStore()
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  // Track if component has mounted (for SSR hydration safety)
  const [hasMounted, setHasMounted] = useState(false)
  
  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title")
      return
    }

    const result = await createItem({
      title: newTitle,
      description: newDescription || undefined,
      image_url: newImageUrl || undefined,
    })

    if (result) {
      toast.success("Item created successfully")
      setNewTitle("")
      setNewDescription("")
      setNewImageUrl(null)
      setIsAdding(false)
    } else {
      toast.error("Failed to create item")
    }
  }

  const handleDelete = async (id: string) => {
    const success = await deleteItem(id)
    if (success) {
      toast.success("Item deleted successfully")
    } else {
      toast.error("Failed to delete item")
    }
    setDeleteConfirmId(null)
  }

  return (
    <div className="space-y-6">
      {/* Show loading state during SSR or while auth is initializing */}
      {!hasMounted || !isInitialized ? (
        <Card className="p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Card>
      ) : !isSignedIn ? (
        /* Prompt for signed-out users */
        <Card className="p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sign in to manage your items</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create, edit, and organize your personal items securely
            </p>
          </div>
          {onSignInClick && (
            <Button onClick={onSignInClick}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign In to Get Started
            </Button>
          )}
        </Card>
      ) : (
        /* Signed-in user content */
        <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Items</h2>
          <p className="text-muted-foreground">
            Manage your items with full CRUD operations
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input
              placeholder="Enter item title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Enter item description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Image</label>
            <FileUpload
              currentFileUrl={newImageUrl || undefined}
              onFileChange={setNewImageUrl}
              accept="image/*"
              folder="items"
              label="Upload Image"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate}>Create Item</Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No items yet</p>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Item
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.image_url && (
                <div className="aspect-video w-full bg-muted">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-lg">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
