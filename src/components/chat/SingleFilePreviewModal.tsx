import { useState, useEffect } from "react";
import { X, Download, Trash2, Loader2, FileText, FileCode, FileJson, Image as ImageIcon } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface SingleFilePreviewModalProps {
  isOpen: boolean;
  file: File | null;
  fileUrl?: string;
  onClose: () => void;
  onDelete?: () => void;
  showDeleteConfirm?: boolean;
}

// Helper to determine file type
const getFileType = (file: File | null, fileUrl?: string): 'image' | 'text' | 'code' | 'json' | 'pdf' | 'unknown' => {
  if (!file && !fileUrl) return 'unknown';
  
  const name = file?.name || fileUrl || '';
  const type = file?.type || '';
  
  // Images
  if (type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(name)) {
    return 'image';
  }
  
  // JSON
  if (type === 'application/json' || /\.json$/i.test(name)) {
    return 'json';
  }
  
  // Code files
  if (/\.(js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|hpp|cs|php|swift|kt|scala|sh|bash|zsh|fish|ps1|yaml|yml|toml|ini|cfg|conf|xml|html|htm|css|scss|sass|less|sql|graphql|gql|md|mdx|vue|svelte)$/i.test(name)) {
    return 'code';
  }
  
  // Plain text
  if (type.startsWith('text/') || /\.(txt|log|readme|env|gitignore|dockerignore|editorconfig)$/i.test(name)) {
    return 'text';
  }
  
  // PDF
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
    return 'pdf';
  }
  
  return 'unknown';
};

// Get file icon
const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'image': return ImageIcon;
    case 'json': return FileJson;
    case 'code': return FileCode;
    default: return FileText;
  }
};

export function SingleFilePreviewModal({ 
  isOpen, 
  file,
  fileUrl,
  onClose, 
  onDelete,
  showDeleteConfirm = true
}: SingleFilePreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  const fileType = getFileType(file, fileUrl);
  const fileName = file?.name || fileUrl?.split('/').pop() || 'file';
  const FileIconComponent = getFileIcon(fileType);

  // Load file content for text-based files
  useEffect(() => {
    if (!isOpen) {
      setFileContent(null);
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
        setImageObjectUrl(null);
      }
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
        setPdfObjectUrl(null);
      }
      return;
    }

    if (file && (fileType === 'text' || fileType === 'code' || fileType === 'json')) {
      setIsLoadingContent(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        let content = e.target?.result as string;
        // Pretty print JSON
        if (fileType === 'json') {
          try {
            content = JSON.stringify(JSON.parse(content), null, 2);
          } catch {
            // Keep original if not valid JSON
          }
        }
        setFileContent(content);
        setIsLoadingContent(false);
      };
      reader.onerror = () => {
        setFileContent('Error reading file');
        setIsLoadingContent(false);
      };
      reader.readAsText(file);
    }

    if (file && fileType === 'image') {
      const url = URL.createObjectURL(file);
      setImageObjectUrl(url);
    }

    if (file && fileType === 'pdf') {
      const url = URL.createObjectURL(file);
      setPdfObjectUrl(url);
    }
  }, [isOpen, file, fileType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
      }
    };
  }, [imageObjectUrl, pdfObjectUrl]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!file && !fileUrl) return;
    
    setIsDownloading(true);
    try {
      if (file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (fileUrl) {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
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

  const renderContent = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        const imgSrc = imageObjectUrl || fileUrl;
        return (
          <div className="flex items-center justify-center p-4 bg-surface/50 rounded-lg">
            <img
              src={imgSrc || ''}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        );

      case 'pdf':
        return (
          <iframe
            src={pdfObjectUrl || fileUrl || ''}
            className="w-full h-[70vh] rounded-lg border border-border"
            title={fileName}
          />
        );

      case 'text':
      case 'code':
      case 'json':
        return (
          <ScrollArea className="h-[70vh] rounded-lg border border-border bg-surface">
            <pre className={cn(
              "p-4 text-sm font-mono whitespace-pre-wrap break-words text-foreground",
              fileType === 'json' && "text-accent"
            )}>
              <code>{fileContent || 'No content'}</code>
            </pre>
          </ScrollArea>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-4">
            <FileIconComponent className="h-16 w-16" />
            <p>Preview not available for this file type</p>
            <p className="text-sm">{file?.type || 'Unknown type'}</p>
          </div>
        );
    }
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
        onClick={onClose}
      >
        {/* Modal content */}
        <div 
          className="relative w-full max-w-4xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between mb-4 bg-surface rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <FileIconComponent className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground truncate max-w-[300px]">{fileName}</span>
              {file && (
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2 rounded-lg bg-surface-hover border border-border hover:bg-primary/20 hover:border-primary/50 transition-colors"
                title="Download"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 text-foreground animate-spin" />
                ) : (
                  <Download className="h-4 w-4 text-foreground" />
                )}
              </button>
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg bg-surface-hover border border-border hover:bg-destructive/20 hover:border-destructive/50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-foreground" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-surface-hover border border-border hover:bg-surface transition-colors"
                title="Close"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{fileName}"? This will remove it from the message.
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
