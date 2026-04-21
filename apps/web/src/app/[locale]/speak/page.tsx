import { getTranslations, setRequestLocale } from "next-intl/server";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";

export default async function SpeakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("speak");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("heading")}</h1>
      </header>
      <VoiceRecorder />
    </main>
  );
}
