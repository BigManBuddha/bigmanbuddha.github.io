/// <reference types="vite/client" />

/** App version from package.json, injected at build time (see vite.config.ts). */
declare const __APP_VERSION__: string;

/** Public build settings from .env (see the README, "Licensing & payments"). */
interface ImportMetaEnv {
  readonly VITE_LICENCE_API?: string;
  readonly VITE_LICENCE_PUBLIC_KEY?: string;
  readonly VITE_BUY_URL?: string;
}
