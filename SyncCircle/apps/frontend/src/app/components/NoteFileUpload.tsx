import { useState, useRef } from "react";
import { Upload, FileText, Loader2, AlertCircle, X } from "lucide-react";

// --- File parsing utilities ---

async function extractTextFromTxt(file: File): Promise<string> {
  return file.text();
}

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// --- File to data URL for download ---

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

// --- AI extraction via Groq ---

async function extractNotesWithAI(rawText: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    // If no AI key, return the raw text as-is
    return rawText;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a note extraction assistant. Given raw text extracted from a document, clean it up and organize it into well-structured study notes. Preserve all important information, fix formatting issues, remove artifacts from PDF/document extraction (like page numbers, headers/footers), and present the content in a clean, readable format. Use markdown-style formatting (headings, bullet points, numbered lists) where appropriate. Do not add information that isn't in the original text.",
        },
        {
          role: "user",
          content: `Please extract and organize the following document text into clean study notes:\n\n${rawText.slice(0, 12000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error("AI extraction failed. Saving raw text instead.");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || rawText;
}

// --- Component ---

export interface FileAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
}

interface NoteFileUploadProps {
  onExtracted: (title: string, content: string, attachment: FileAttachment) => void;
  onCancel: () => void;
}

export function NoteFileUpload({ onExtracted, onCancel }: NoteFileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = ".txt,.pdf,.doc,.docx";
  const ACCEPTED_MIME = [
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  async function processFile(file: File) {
    setIsProcessing(true);
    setError(null);

    try {
      let rawText = "";
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "txt") {
        rawText = await extractTextFromTxt(file);
      } else if (ext === "pdf") {
        rawText = await extractTextFromPdf(file);
      } else if (ext === "doc" || ext === "docx") {
        rawText = await extractTextFromDocx(file);
      } else {
        throw new Error("Unsupported file type. Please use .txt, .pdf, or .docx files.");
      }

      if (!rawText.trim()) {
        throw new Error("No text content could be extracted from this file.");
      }

      // Convert file to base64 data URL for download later
      const dataUrl = await fileToDataUrl(file);

      // Use AI to clean and organize the extracted text
      let processedContent: string;
      try {
        processedContent = await extractNotesWithAI(rawText);
      } catch {
        // Fallback: use raw text if AI fails
        processedContent = rawText;
      }

      // Use filename (without extension) as the note title
      const title = file.name.replace(/\.[^/.]+$/, "");
      const attachment: FileAttachment = {
        fileName: file.name,
        fileType: file.type || `application/${ext}`,
        fileSize: file.size,
        dataUrl,
      };
      onExtracted(title, processedContent, attachment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && ACCEPTED_MIME.includes(file.type)) {
      processFile(file);
    } else if (file) {
      setError("Unsupported file type. Please use .txt, .pdf, or .docx files.");
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50"
        } ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Extracting notes with AI...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports .txt, .pdf, and .docx files
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload note file"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Cancel */}
      <div className="flex justify-end">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="px-3 py-1.5 rounded-lg hover:bg-accent text-sm flex items-center gap-1 disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
