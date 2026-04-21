import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm text-blue-700 dark:text-blue-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Community-powered Nepali AI
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-br from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
          {t("heading")}
        </h1>

        <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
          {t("sub")}
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
        <Button asChild size="lg" className="flex-1 h-12 text-base font-semibold">
          <Link href="/speak">{t("cta_speak")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="flex-1 h-12 text-base">
          <Link href="/contribute">Help Improve AI</Link>
        </Button>
      </div>

      {/* Secondary CTA */}
      <Button asChild variant="ghost" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <Link href="https://overseasnepal.com" target="_blank" rel="noreferrer">
          {t("cta_learn")} →
        </Link>
      </Button>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mt-16">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--foreground)]">Voice Recognition</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Advanced Nepali speech-to-text technology</p>
        </div>

        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--foreground)]">Community Powered</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Built with contributions from Nepali speakers worldwide</p>
        </div>

        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[var(--foreground)]">AI Conversations</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Natural conversations in Nepali with AI responses</p>
        </div>
      </div>
    </main>
  );
}
