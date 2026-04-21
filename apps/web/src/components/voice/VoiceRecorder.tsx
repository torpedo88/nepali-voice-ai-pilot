"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sendVoice, ApiError } from "@/lib/api";
import { RecordingButton } from "@/components/ui/recording-button";
import { Select } from "@/components/ui/select";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { ChatBubble } from "@/components/ui/chat-bubble";

type Turn = { user: string; ai: string; audioUrl: string };
type Status = "idle" | "recording" | "processing" | "error";

export function VoiceRecorder() {
  const t = useTranslations("speak");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voice, setVoice] = useState("Sagar (Male)");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      turns.forEach((turn) => URL.revokeObjectURL(turn.audioUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setErrorMsg(null);
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
      setStatus("recording");
    } catch {
      setStatus("error");
      setErrorMsg(t("error_no_mic"));
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
      const reply = await sendVoice(blob, { voice, sessionId });
      setSessionId(reply.sessionId || sessionId);
      setTurns((prev) => [...prev, { user: reply.userText, ai: reply.aiText, audioUrl: reply.audioUrl }]);

      const audio = new Audio(reply.audioUrl);
      audio.play().catch(() => {}); // autoplay blocked → user clicks to replay
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof ApiError ? err.message : t("error_generic"));
    }
  }

  const recording = status === "recording";
  const processing = status === "processing";

  // Status message logic
  const getStatusMessage = () => {
    if (status === "error") return errorMsg || t("error_generic");
    if (recording) return t("recording");
    if (processing) return t("thinking");
    return t("hint");
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Voice Selection */}
      <div className="flex justify-center">
        <div className="w-48">
          <Select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            disabled={recording || processing}
            label={t("voice_label")}
          >
            <option value="Sagar (Male)">{t("voices.male")}</option>
            <option value="Hemkala (Female)">{t("voices.female")}</option>
          </Select>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4">
        <RecordingButton
          isRecording={recording}
          isProcessing={processing}
          onClick={recording ? stop : start}
          aria-label={recording ? "stop recording" : "start recording"}
        />

        <StatusIndicator
          status={status}
          message={getStatusMessage()}
        />
      </div>

      {/* Conversation History */}
      {turns.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-center text-[var(--muted-foreground)]">
            Conversation
          </h2>
          <div className="space-y-6">
            {turns.map((turn, i) => (
              <ChatBubble
                key={i}
                userText={turn.user}
                aiText={turn.ai}
                audioUrl={turn.audioUrl}
              />
            ))}
          </div>
        </div>
      )}
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
