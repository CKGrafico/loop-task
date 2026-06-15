import en from "./en.json";

export type I18nKey = keyof typeof en;

export type I18nParams = Record<string, string | number>;

const messages: Record<string, string> = en;

export function t(key: I18nKey, params?: I18nParams): string {
  let result = messages[key] ?? key;
  if (params) {
    for (const name of Object.keys(params)) {
      result = result.split(`{${name}}`).join(String(params[name]));
    }
  }
  return result;
}
