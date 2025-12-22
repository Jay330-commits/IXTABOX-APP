"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UploadedFile {
  path: string;
  publicUrl: string;
  signedUrl: string;
  uploadedAt: string;
}

export default function BucketTestPage() {
  const { token, loading: authLoading, user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch files when token is available
  useEffect(() => {
    if (!authLoading && token) {
      fetchFiles();
    }
  }, [authLoading, token]);

  const fetchFiles = async () => {
    if (!token) {
      setFetchError("Please log in to view files");
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/test/bucket/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Please log in.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch files");
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFetchError(
        error instanceof Error ? error.message : "Failed to fetch files"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file");
      return;
    }

    if (!token) {
      setUploadError("Please log in to upload files");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/test/bucket/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setUploadSuccess(
        `File uploaded successfully! Path: ${data.path}, URL: ${data.url.substring(0, 50)}...`
      );
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById(
        "file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Refresh file list
      await fetchFiles();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    if (!token) {
      alert("Please log in to delete files");
      return;
    }

    try {
      const response = await fetch("/api/test/bucket/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      // Refresh file list
      await fetchFiles();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Delete failed");
    }
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">
            Bucket Test Page
          </h1>
          <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-6 py-4 rounded-lg text-center">
            <p className="text-lg font-semibold mb-2">Authentication Required</p>
            <p>Please log in to use the bucket test page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Bucket Test Page
        </h1>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Upload Image</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="file-input"
                className="block text-sm font-medium mb-2"
              >
                Select Image (Max 5MB)
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
              />
            </div>

            {selectedFile && (
              <div className="bg-gray-700 p-4 rounded-md">
                <p className="text-sm">
                  <strong>File:</strong> {selectedFile.name}
                </p>
                <p className="text-sm">
                  <strong>Size:</strong>{" "}
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <p className="text-sm">
                  <strong>Type:</strong> {selectedFile.type}
                </p>
              </div>
            )}

            {uploadError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-md">
                {uploadSuccess}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              {uploading ? "Uploading..." : "Upload to Test Bucket"}
            </button>
          </div>
        </div>

        {/* Files List Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Uploaded Files</h2>
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {fetchError && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md mb-4">
              {fetchError}
            </div>
          )}

          {loading && files.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No files uploaded yet. Upload an image to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                >
                  <div className="mb-4">
                    <img
                      src={file.signedUrl}
                      alt={`Uploaded ${index + 1}`}
                      className="w-full h-48 object-cover rounded-md"
                      onError={(e) => {
                        // Fallback to public URL if signed URL fails
                        const img = e.target as HTMLImageElement;
                        img.src = file.publicUrl;
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Path:</strong>
                      <p className="text-gray-300 break-all text-xs">
                        {file.path}
                      </p>
                    </div>
                    <div>
                      <strong>Uploaded:</strong>
                      <p className="text-gray-300">
                        {new Date(file.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <a
                        href={file.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white text-center py-2 px-3 rounded-md text-xs transition-colors"
                      >
                        View Signed URL
                      </a>
                      <button
                        onClick={() => handleDelete(file.path)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-md text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                        Show URLs
                      </summary>
                      <div className="mt-2 space-y-1 text-xs">
                        <div>
                          <strong>Public URL:</strong>
                          <p className="text-gray-400 break-all">
                            {file.publicUrl}
                          </p>
                        </div>
                        <div>
                          <strong>Signed URL:</strong>
                          <p className="text-gray-400 break-all">
                            {file.signedUrl.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-gray-800 rounded-lg p-6 mt-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Test Information</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <strong>Bucket Name:</strong> box_returns (test files in test_uploads folder)
            </p>
            <p>
              <strong>Authentication:</strong>{" "}
              {token ? "Authenticated" : "Not authenticated"}
            </p>
            <p>
              <strong>Signed URL Expiry:</strong> 1 hour
            </p>
            <p className="text-xs text-gray-400 mt-4">
              This page tests uploading images to Supabase Storage and fetching
              them using both public URLs and signed URLs. Signed URLs are
              temporary and expire after 1 hour for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

