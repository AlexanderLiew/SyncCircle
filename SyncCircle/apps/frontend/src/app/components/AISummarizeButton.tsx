import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useKiroAPI } from "../hooks/useKiroAPI";

interface AISummarizeButtonProps {
  noteContent: string;
  existingSummary?: string;
  onSummaryGenerated: (summary: string) => void;
}

export function AISummarizeButton({
  noteContent,
  existingSummary,
  onSummaryGenerated,
}: AISummarizeButtonProps) {
  const { summarizeNote, isLoading } = useKiroAPI();
  const [summary, setSummary] = useState<string | null>(existingSummary || null);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    if (!noteContent.trim()) return;

    setError(null);
    const result = await summarizeNote(noteContent);

    if (result.data?.summary) {
      setSummary(result.data.summary);
      onSummaryGenerated(result.data.summary);
    } else if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div className="space-y-3">
      {/* Summarize Button */}
      <button
        onClick={handleSummarize}
        disabled={isLoading || !noteContent.trim()}
        className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        aria-label="AI Summarize"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Summarizing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            AI Summarize
          </>
        )}
      </button>

      {/* Error State with Retry */}
      {error && !isLoading && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={handleSummarize}
              className="mt-2 px-3 py-1 rounded-md bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors text-xs font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary Display */}
      {summary && !isLoading && !error && (
        <div className="p-3 rounded-lg bg-purple-600/10 border border-purple-500/20">
          <p className="text-xs font-medium text-purple-300 mb-1">AI Summary</p>
          <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}
