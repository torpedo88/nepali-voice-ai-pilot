"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sendContribution, getContributionStats, ApiError } from "@/lib/api";
import { RecordingButton } from "@/components/ui/recording-button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Status = "idle" | "recording" | "processing" | "success" | "error";

export function ContributeRecorder() {
  const t = useTranslations("contribute");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expectedText, setExpectedText] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Load contribution stats on mount
    getContributionStats().then(setStats).catch(() => {});

    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  async function start() {
    if (!expectedText.trim()) {
      setErrorMsg("Please enter the expected Nepali text first");
      return;
    }

    setErrorMsg(null);
    setStatus("recording");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream, { mimeType: preferredMime() });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => void handleStop(mr.mimeType);
      mr.start();
      mediaRecorderRef.current = mr;
    } catch {
      setStatus("error");
      setErrorMsg("Could not access microphone. Please check permissions.");
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }

  async function handleStop(mimeType: string) {
    setStatus("processing");
    const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });

    try {
      const result = await sendContribution(
        blob,
        expectedText.trim(),
        contributorName.trim() || undefined
      );

      setContributionId(result.contributionId);
      setSuccessMsg(result.message);
      setStatus("success");

      // Refresh stats
      const newStats = await getContributionStats();
      setStats(newStats);

      // Clear form
      setExpectedText("");
      setContributorName("");

      // Auto-reset after 5 seconds
      setTimeout(() => {
        setStatus("idle");
        setSuccessMsg(null);
        setContributionId(null);
      }, 5000);

    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to submit contribution");
    }
  }

  const recording = status === "recording";
  const processing = status === "processing";

  // Status message logic
  const getStatusMessage = () => {
    if (status === "error") return errorMsg || "Failed to submit contribution";
    if (recording) return "Recording... Read the text above clearly";
    if (processing) return "Processing contribution...";
    if (status === "success") return successMsg || "Contribution submitted successfully!";
    if (expectedText.trim()) return "Click to record the text above";
    return "Enter Nepali text above, then click to record";
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Stats */}
      <div className="rounded-lg border border-[var(--border)] p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 text-center">
        <h3 className="text-lg font-semibold mb-3 text-[var(--foreground)]">Community Impact</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Total</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Pending</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">Approved</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        <Textarea
          label="Expected Nepali Text"
          value={expectedText}
          onChange={(e) => setExpectedText(e.target.value)}
          placeholder="तपाईंले बोल्ने नेपाली पाठ यहाँ लेख्नुहोस्... (Write the Nepali text you will speak here...)"
          disabled={recording || processing}
          description="Write exactly what you plan to speak in Devanagari script."
          required
        />

        <Input
          label="Your Name (Optional)"
          type="text"
          value={contributorName}
          onChange={(e) => setContributorName(e.target.value)}
          placeholder="Your name for attribution (optional)"
          disabled={recording || processing}
          description="We'll credit your contribution if you provide a name."
        />
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4">
        <RecordingButton
          isRecording={recording}
          isProcessing={processing}
          onClick={recording ? stop : start}
          disabled={!expectedText.trim()}
          aria-label={recording ? "stop recording" : "start recording"}
        />

        <StatusIndicator
          status={status}
          message={getStatusMessage()}
          className="max-w-sm"
        />

        {contributionId && (
          <p className="text-xs text-[var(--muted-foreground)] font-mono bg-[var(--muted)] px-2 py-1 rounded">
            ID: {contributionId}
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-[var(--border)] p-6 bg-[var(--muted)]/30 space-y-4">
        <h3 className="font-semibold text-[var(--foreground)]">How to Contribute</h3>
        <ol className="space-y-2 text-sm text-[var(--muted-foreground)]">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
            <span>Write the exact Nepali text you want to record</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
            <span>Click the microphone button to start recording</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">3</span>
            <span>Read the text clearly in a quiet environment</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-medium">4</span>
            <span>Your audio will help improve the Nepali voice AI model</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function preferredMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}