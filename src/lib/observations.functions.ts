import { createServerFn } from "@tanstack/react-start";

const SPREADSHEET_ID = "1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8";
const SHEET_NAME = "Respostas ao formulário 1";

export type Modalidade = "Diálogo Formativo" | "Devolutiva" | "Encontro Formativo";

export interface RubricItem {
  criterio: string;
  value: string;
  score: number | null;
}

export interface ObservationRow {
  /** A — Carimbo de data/hora */
  timestamp: string;
  /** B — E-mail do tutor */
  tutorEmail: string;
  /** C — Nome do tutor */
  tutor: string;
  /** D — Nome do formador */
  formador: string;
  /** E — E-mail institucional do formador */
  formadorEmail: string;
  /** F — Ação de Acompanhamento */
  acaoAcompanhamento: string;
  /** G — Ação Observada (Diálogo / Devolutiva / Encontro) */
  acaoObservada: string;
  /** H — Data da Observação */
  dataObservacao: string;
  /** I — Link da Ação Observada */
  linkAcaoObservada: string;
  /** J — Data do Feedback */
  dataFeedback: string;
  /** K — Link do Feedback */
  linkFeedback: string;
  /** L — Links complementares */
  linksComplementares: string;
  /** Modalidade detectada a partir de G */
  modalidade: Modalidade | "Outros";
  /** M–V: Rubrica Diálogo Formativo (cols 12–21) | W–AB: Devolutiva (22–27) | AC–AI: Encontro (28–34) */
  rubrics: RubricItem[];
  avgScore: number | null;
  /** AJ — Checklist: ações realizadas corretamente */
  checklistRealizadas: string;
  /** AK — Checklist: ações NÃO realizadas adequadamente */
  checklistNaoRealizadas: string;
  /** AL — Outros registros adicionais (ações operacionais) */
  outrosRegistros: string;
  /** AM — Habilidades de maior destaque */
  destaques: string;
  /** AN — Habilidades que precisam ser desenvolvidas */
  desenvolver: string;
  /** AO — Encaminhamentos / sugestões / combinados */
  encaminhamentos: string;
}

// ── Critérios por modalidade ──────────────────────────────────────────────
const DIALOGO_CRITERIA = [
  "Planejamento e prazo",
  "Etapas do diálogo formativo",
  "Materiais formativos",
  "Questionamentos propositivos",
  "Análise por evidências",
  "Acolhimento e escuta ativa",
  "Mediação de conflitos",
  "Sugestão de materiais e repertório",
  "Construção conjunta de combinados",
  "Gestão do tempo (10 a 20 min)",
];

const DEVOLUTIVA_CRITERIA = [
  "Planejamento e prazo",
  "Etapas da devolutiva",
  "Materiais formativos",
  "Análise por evidências",
  "Sugestão de materiais e repertório",
  "Gestão do tempo (5 a 10 min)",
];

const ENCONTRO_CRITERIA = [
  "Condução a partir do roteiro",
  "Orientação por PDP e rubrica",
  "Transposição didática e contextualização",
  "Gestão da interação",
  "Comunicação e clima formativo",
  "Competência digital",
  "Gestão do tempo",
];

// ── Helpers ──────────────────────────────────────────────────────────────
/** Strip combining diacritics after NFD decomposition */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function scoreFor(v: string): number | null {
  if (!v) return null;
  // Normalize to NFC first, then uppercase, then strip accents for comparison
  const u = v.normalize("NFC").toUpperCase();
  const plain = stripAccents(u);
  if (plain.includes("NAO ATENDEU") && !plain.includes("PARCIALMENTE")) return 0;
  if (plain.includes("PARCIALMENTE")) return 1;
  if (plain.includes("SUPEROU")) return 3;
  if (plain.includes("INTEGRALMENTE")) return 2;
  if (plain.includes("ATENDEU") && !plain.includes("PARCIALMENTE")) return 2;
  if (plain.includes("NAO OBSERVADO")) return null;
  return null;
}

function detectModalidade(acaoObservada: string, acaoAcompanhamento: string): ObservationRow["modalidade"] {
  // Normalize + strip accents so NFD/NFC differences from Google Forms don't break detection
  const src = stripAccents((acaoObservada || acaoAcompanhamento || "").normalize("NFC").toLowerCase());
  if (src.includes("dialogo")) return "Diálogo Formativo";
  if (src.includes("devolutiva")) return "Devolutiva";
  if (src.includes("encontro")) return "Encontro Formativo";
  return "Outros";
}

// ── JWT / OAuth helpers (service-account) ────────────────────────────────
function base64UrlEncode(input: Uint8Array | string): string {
  let binary: string;
  if (typeof input === "string") {
    const encoded = new TextEncoder().encode(input);
    binary = "";
    for (let i = 0; i < encoded.length; i++) binary += String.fromCharCode(encoded[i]);
  } else {
    binary = "";
    for (let i = 0; i < input.length; i++) binary += String.fromCharCode(input[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  let formattedPrivateKey = privateKey.trim();
  if (
    (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) ||
    (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'"))
  ) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  }
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, "\n");

  if (!formattedPrivateKey.includes("-----BEGIN PRIVATE KEY-----")) throw new Error("Invalid private key: missing BEGIN marker");
  if (!formattedPrivateKey.includes("-----END PRIVATE KEY-----")) throw new Error("Invalid private key: missing END marker");

  const headerObj = { alg: "RS256", typ: "JWT" };
  const header = base64UrlEncode(JSON.stringify(headerObj));
  const now = Math.floor(Date.now() / 1000);
  const payloadObj = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const messageBuffer = new TextEncoder().encode(`${header}.${payload}`);

  const pemLines = formattedPrivateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryString = atob(pemLines);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  const key = await crypto.subtle.importKey("pkcs8", bytes.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, messageBuffer);
  const signatureBase64 = base64UrlEncode(new Uint8Array(signatureBuffer));
  const jwt = `${header}.${payload}.${signatureBase64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google OAuth error ${res.status}: ${text}`);
  const data = JSON.parse(text) as { access_token: string };
  if (!data.access_token) throw new Error(`No access_token: ${text}`);
  return data.access_token;
}

// ── Main server function ──────────────────────────────────────────────────
export const getObservations = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ rows: ObservationRow[]; fetchedAt: string }> => {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!clientEmail || !privateKey) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    // Columns A (0) to AO (40) — 41 columns total
    const range = `${SHEET_NAME}!A2:AO`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Sheets API ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { values?: string[][] };
    const values = json.values ?? [];

    const rows: ObservationRow[] = values
      .filter((r) => r && r.length > 2 && (r[2] || "").trim())
      .map((r) => {
        const get = (i: number) => (r[i] ?? "").toString().trim();

        // ── Column mapping ──────────────────────────────────────────────
        // A=0  B=1  C=2  D=3  E=4  F=5  G=6  H=7  I=8  J=9  K=10  L=11
        // M=12 N=13 O=14 P=15 Q=16 R=17 S=18 T=19 U=20 V=21   (Diálogo 10)
        // W=22 X=23 Y=24 Z=25 AA=26 AB=27                      (Devolutiva 6)
        // AC=28 AD=29 AE=30 AF=31 AG=32 AH=33 AI=34            (Encontro 7)
        // AJ=35  AK=36  AL=37  AM=38  AN=39  AO=40

        const acaoObservada = get(6);
        const acaoAcompanhamento = get(5);
        const modalidade = detectModalidade(acaoObservada, acaoAcompanhamento);

        let rubrics: RubricItem[] = [];
        if (modalidade === "Diálogo Formativo") {
          rubrics = DIALOGO_CRITERIA.map((c, i) => ({
            criterio: c,
            value: get(12 + i),    // cols M(12) to V(21)
            score: scoreFor(get(12 + i)),
          }));
        } else if (modalidade === "Devolutiva") {
          rubrics = DEVOLUTIVA_CRITERIA.map((c, i) => ({
            criterio: c,
            value: get(22 + i),    // cols W(22) to AB(27)
            score: scoreFor(get(22 + i)),
          }));
        } else if (modalidade === "Encontro Formativo") {
          rubrics = ENCONTRO_CRITERIA.map((c, i) => ({
            criterio: c,
            value: get(28 + i),    // cols AC(28) to AI(34)
            score: scoreFor(get(28 + i)),
          }));
        }

        const scored = rubrics.filter((x) => x.score !== null);
        const avg = scored.length > 0 ? scored.reduce((s, x) => s + (x.score ?? 0), 0) / scored.length : null;

        return {
          timestamp: get(0),
          tutorEmail: get(1),
          tutor: get(2),
          formador: get(3),
          formadorEmail: get(4),
          acaoAcompanhamento,
          acaoObservada,
          dataObservacao: get(7),
          linkAcaoObservada: get(8),
          dataFeedback: get(9),
          linkFeedback: get(10),
          linksComplementares: get(11),
          modalidade,
          rubrics,
          avgScore: avg,
          checklistRealizadas: get(35),    // AJ
          checklistNaoRealizadas: get(36), // AK
          outrosRegistros: get(37),        // AL
          destaques: get(38),              // AM
          desenvolver: get(39),            // AN
          encaminhamentos: get(40),        // AO
        };
      });

    return { rows, fetchedAt: new Date().toISOString() };
  },
);