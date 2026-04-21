import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const messageImports = {
  en: () => import("@/messages/en.json"),
  ne: () => import("@/messages/ne.json"),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && requested in messageImports
      ? (requested as keyof typeof messageImports)
      : routing.defaultLocale;

  return {
    locale,
    messages: (await messageImports[locale as keyof typeof messageImports]()).default,
  };
});
