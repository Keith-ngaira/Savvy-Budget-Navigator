import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Upload, AlertCircle } from "lucide-react";
import { formatError } from "@/lib/errorUtils";

interface ReceiptUploadProps {
  onClose: () => void;
  onUploaded: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ReceiptUpload = ({ onClose, onUploaded }: ReceiptUploadProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File type not supported. Please upload PDF or image files.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 10MB limit.";
    }
    return null;
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const error = validateFile(files[0]);
      if (error) {
        toast({
          title: "Invalid File",
          description: error,
          variant: "destructive",
        });
      } else {
        setSelectedFile(files[0]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const error = validateFile(e.target.files[0]);
      if (error) {
        toast({
          title: "Invalid File",
          description: error,
          variant: "destructive",
        });
      } else {
        setSelectedFile(e.target.files[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create receipt record
      const { error: dbError } = await supabase.from("receipts").insert({
        user_id: user.id,
        file_name: selectedFile.name,
        file_path: fileName,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
      });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Receipt uploaded successfully",
      });

      onUploaded();
      onClose();
    } catch (err) {
      const message = formatError(err);
      console.error("Error uploading receipt:", message);
      toast({
        title: "Error",
        description: `Failed to upload receipt: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex items-center justify-between flex-row pb-3">
          <CardTitle>Upload Receipt</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {!selectedFile ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                onChange={handleFileSelect}
                accept={ALLOWED_TYPES.join(",")}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isLoading}
              />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium text-sm mb-1">Drag and drop your file</p>
              <p className="text-xs text-muted-foreground">
                or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PDF or image (max 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50 border border-dashed border-primary/50">
                <p className="font-medium text-sm truncate mb-1">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isLoading}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Remove File
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 dark:text-blue-200">
                Supported formats: PDF, JPEG, PNG, WebP, GIF
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isLoading || !selectedFile}
              className="flex-1"
            >
              {isLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptUpload;
