/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** POST destination for leads (JSON). See src/lib/submitLead.ts. */
  readonly VITE_LEAD_ENDPOINT?: string;
  /** mailto fallback when no endpoint is configured. See src/lib/submitLead.ts. */
  readonly VITE_LEAD_FALLBACK_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
