"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react"
import { toast } from "sonner"

interface UploadState {
  file: File | null
  isUploading: boolean
  progress: number
  error: string | null
  success: boolean
}

export default function UploadPage() {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadState((prev) => ({
        ...prev,
        file,
        error: null,
        success: false,
      }))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  })

  const removeFile = () => {
    setUploadState((prev) => ({
      ...prev,
      file: null,
      error: null,
      success: false,
    }))
  }

  const handleUpload = async () => {
    if (!uploadState.file) return

    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      success: false,
    }))

    try {
      const formData = new FormData()
      formData.append("file", uploadState.file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }))
      }, 200)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Upload failed")
      }

      const result = await response.json()

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
        success: true,
      }))

      toast.success(`Excel imported successfully! ${result.rows} rows processed.`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: errorMessage,
      }))

      toast.error(`Upload failed: ${errorMessage}`)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Excel Upload</h1>
            <p className="text-muted-foreground">Upload Excel files to import placement data into the system</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                File Upload
              </CardTitle>
              <CardDescription>Select an Excel file (.xlsx or .xls) containing placement data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Drop Zone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                  }
                  ${uploadState.file ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}
                `}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  {uploadState.file ? (
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  ) : (
                    <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto" />
                  )}

                  {uploadState.file ? (
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-green-700 dark:text-green-400">File Selected</p>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <span>{uploadState.file.name}</span>
                        <span>•</span>
                        <span>{formatFileSize(uploadState.file.size)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile()
                          }}
                          className="ml-2 h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-lg font-medium">
                        {isDragActive ? "Drop the file here" : "Drag & drop your Excel file here"}
                      </p>
                      <p className="text-sm text-muted-foreground">or click to browse files</p>
                      <p className="text-xs text-muted-foreground">Supports .xlsx and .xls files</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadState.isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadState.progress}%</span>
                  </div>
                  <Progress value={uploadState.progress} className="h-2" />
                </div>
              )}

              {/* Error Message */}
              {uploadState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadState.error}</AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {uploadState.success && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    File uploaded successfully! Data has been imported into the database.
                  </AlertDescription>
                </Alert>
              )}

              {/* Upload Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleUpload}
                  disabled={!uploadState.file || uploadState.isUploading}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {uploadState.isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
   
  )
}
