import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ne"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
