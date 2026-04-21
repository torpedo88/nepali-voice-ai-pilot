import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContributeRecorder } from "@/components/voice/ContributeRecorder";

export default async function ContributePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contribute");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Help Improve Nepali Voice AI
        </h1>
        <p className="mt-2 text-lg text-[var(--muted-foreground)]">
          Contribute your voice to help train a better Nepali speech recognition model
        </p>
      </header>
      <ContributeRecorder />
    </main>
  );
}