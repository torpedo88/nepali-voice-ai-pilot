import { env } from "./env";

export type VoiceReply = {
  userText: string;
  aiText: string;
  sessionId: string;
  audioUrl: string; // object URL — caller revokes when done
};

export type ContributeReply = {
  contributionId: string;
  message: string;
  status: string;
};

export type ContributionStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Send a mic recording to the backend and get a voice reply.
 * Uses /v1/voice (end-to-end) so we get one round-trip instead of three.
 * Transcripts come back in response headers; audio is the body.
 */
export async function sendVoice(
  blob: Blob,
  opts: { voice?: string; sessionId?: string | null } = {}
): Promise<VoiceReply> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  form.append("voice", opts.voice ?? "Sagar (Male)");
  if (opts.sessionId) form.append("session_id", opts.sessionId);

  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/v1/voice`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || `Request failed (${res.status})`);
  }

  const audioBlob = await res.blob();
  return {
    // Server percent-encodes Devanagari to fit in latin-1 HTTP headers.
    userText: decodeURIComponent(res.headers.get("X-User-Text") ?? ""),
    aiText: decodeURIComponent(res.headers.get("X-Ai-Text") ?? ""),
    sessionId: res.headers.get("X-Session-Id") ?? "",
    audioUrl: URL.createObjectURL(audioBlob),
  };
}

/**
 * Submit an audio contribution for model training.
 * Audio blob + expected Nepali transcript → training data.
 */
export async function sendContribution(
  blob: Blob,
  expectedText: string,
  contributorName?: string
): Promise<ContributeReply> {
  const form = new FormData();
  form.append("audio", blob, "contribution.webm");
  form.append("text", expectedText);
  if (contributorName) form.append("contributor_name", contributorName);

  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/v1/contribute`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || `Request failed (${res.status})`);
  }

  const data = await res.json();
  return {
    contributionId: data.contribution_id,
    message: data.message,
    status: data.status,
  };
}

/**
 * Get contribution statistics.
 */
export async function getContributionStats(): Promise<ContributionStats> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/v1/contribute/stats`);

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || `Request failed (${res.status})`);
  }

  return res.json();
}
