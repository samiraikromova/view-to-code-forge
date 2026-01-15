import { useState } from "react";
import { X, Download, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onDelete?: () => void;
  showDeleteConfirm?: boolean;
}

export function ImageModal({ 
  isOpen, 
  imageUrl, 
  onClose, 
  onDelete,
  showDeleteConfirm = true
}: ImageModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      setShowDeleteDialog(true);
    } else {
      onDelete?.();
      onClose();
    }
  };

  const confirmDelete = () => {
    onDelete?.();
    setShowDeleteDialog(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Modal content */}
        <div 
          className="relative max-w-[90vw] max-h-[90vh] animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 rounded-full bg-surface border border-border hover:bg-surface-hover transition-colors z-10"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>

          {/* Action buttons */}
          <div className="absolute -top-12 left-0 flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 rounded-full bg-surface border border-border hover:bg-surface-hover transition-colors"
            >
              {isDownloading ? (
                <Loader2 className="h-5 w-5 text-foreground animate-spin" />
              ) : (
                <Download className="h-5 w-5 text-foreground" />
              )}
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-full bg-surface border border-border hover:bg-destructive/20 hover:border-destructive/50 transition-colors"
              >
                <Trash2 className="h-5 w-5 text-foreground hover:text-destructive" />
              </button>
            )}
          </div>

          {/* Image */}
          <img
            src={imageUrl}
            alt="Generated image full size"
            className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
