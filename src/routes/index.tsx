import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, Suspense, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import { getObservations, type ObservationRow } from "@/lib/observations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const obsQueryOptions = queryOptions({
  queryKey: ["observations"],
  queryFn: () => getObservations(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Observação Formativa — Estágio Probatório" },
      {
        name: "description",
        content:
          "Análise das observações por tutor, formador e modalidade (Diálogo, Devolutiva, Encontro Formativo) — SEED-PR.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(obsQueryOptions),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Erro ao carregar dados: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Não encontrado.</div>,
});

// ── Color palette ─────────────────────────────────────────────────────────
const BRAND = {
  green: "#43a047",
  greenDark: "#2e7d32",
  blue: "#1976d2",
  blueDark: "#1565c0",
  teal: "#00897b",
  amber: "#f57c00",
  purple: "#7b1fa2",
};

const STATUS_COLORS: Record<string, string> = {
  superou: "#1565c0",
  atendeu: BRAND.green,
  parcial: BRAND.amber,
  nao: "#e53935",
};

const MODALIDADES = ["Diálogo Formativo", "Devolutiva", "Encontro Formativo"] as const;

function classifyValue(v: string): "superou" | "atendeu" | "parcial" | "nao" | null {
  if (!v) return null;
  const u = v.toUpperCase();
  if (u.includes("SUPEROU")) return "superou";
  if (u.includes("NÃO OBSERVADO")) return null;
  if (u.includes("PARCIALMENTE")) return "parcial";
  if (u.includes("NÃO ATENDEU")) return "nao";
  if (u.includes("INTEGRALMENTE") || u.includes("ATENDEU")) return "atendeu";
  return null;
}

// ── Auth guard ────────────────────────────────────────────────────────────
function useAuthGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    const session = sessionStorage.getItem("ep_user");
    if (!session) navigate({ to: "/login" });
  }, [navigate]);
}

// ── Entry component ───────────────────────────────────────────────────────
function Index() {
  useAuthGuard();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
            />
            <p className="text-sm text-muted-foreground">Carregando dados…</p>
          </div>
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard() {
  const { data } = useSuspenseQuery(obsQueryOptions);
  const rows = data.rows;
  const navigate = useNavigate();

  const tutores = useMemo(
    () => Array.from(new Set(rows.map((r) => r.tutor))).filter(Boolean).sort(),
    [rows],
  );
  const formadores = useMemo(
    () => Array.from(new Set(rows.map((r) => r.formador))).filter(Boolean).sort(),
    [rows],
  );

  const stats = useMemo(() => {
    const byMod: Record<string, number> = {};
    let totalScored = 0;
    let sumScore = 0;
    rows.forEach((r) => {
      byMod[r.modalidade] = (byMod[r.modalidade] ?? 0) + 1;
      r.rubrics.forEach((x) => {
        if (x.score !== null) { totalScored++; sumScore += x.score; }
      });
    });
    const modMaisFreq = Object.entries(byMod).sort((a, b) => b[1] - a[1])[0];
    return {
      total: rows.length,
      tutores: tutores.length,
      formadores: formadores.length,
      byMod,
      avg: totalScored ? (sumScore / totalScored).toFixed(2) : "—",
      modMaisFreq: modMaisFreq ? modMaisFreq[0].replace(" Formativo", "") : "—",
    };
  }, [rows, tutores, formadores]);

  // Session user
  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem("ep_user") || "{}"); }
    catch { return {}; }
  })();

  function handleLogout() {
    sessionStorage.removeItem("ep_user");
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="header-gradient shadow-lg">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="https://www.educacao.pr.gov.br/sites/default/arquivos_restritos/files/imagem/2025-07/estagio-probatorio690x311.png"
              alt="Estágio Probatório"
              className="h-10 object-contain brightness-0 invert"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">
                Painel de Observação Formativa
              </h1>
              <p className="text-xs text-white/75">
                SEED-PR · Atualizado {new Date(data.fetchedAt).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.email && (
              <span className="hidden sm:block text-xs text-white/80 font-medium">
                {user.email}
              </span>
            )}
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* ── KPI Cards ── */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Observações" value={stats.total} variant="green" icon="📋" />
          <StatCard label="Tutores" value={stats.tutores} variant="blue" icon="👤" />
          <StatCard label="Formadores" value={stats.formadores} variant="teal" icon="🎓" />
          <StatCard label="Nota média" value={stats.avg} variant="amber" icon="⭐" hint="escala 0 (não atendeu) a 3 (superou)" />
          <StatCard label="Modalidade líder" value={stats.modMaisFreq} variant="purple" icon="📊" />
        </section>

        {/* ── Tabs ── */}
        <Tabs defaultValue="modalidade" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 rounded-xl bg-muted p-1">
            <TabsTrigger value="modalidade" className="rounded-lg text-xs sm:text-sm">Por modalidade</TabsTrigger>
            <TabsTrigger value="tutor" className="rounded-lg text-xs sm:text-sm">Por tutor</TabsTrigger>
            <TabsTrigger value="formador" className="rounded-lg text-xs sm:text-sm">Por formador</TabsTrigger>
            <TabsTrigger value="checklist" className="rounded-lg text-xs sm:text-sm">Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="modalidade" className="mt-6">
            <ModalidadeView rows={rows} />
          </TabsContent>
          <TabsContent value="tutor" className="mt-6">
            <PersonView rows={rows} field="tutor" options={tutores} label="tutor" />
          </TabsContent>
          <TabsContent value="formador" className="mt-6">
            <PersonView rows={rows} field="formador" options={formadores} label="formador" />
          </TabsContent>
          <TabsContent value="checklist" className="mt-6">
            <ChecklistView rows={rows} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────
const STAT_VARIANTS: Record<string, string> = {
  green: "stat-card-green",
  blue: "stat-card-blue",
  teal: "stat-card-teal",
  amber: "stat-card-amber",
  purple: "stat-card-purple",
};

function StatCard({
  label, value, hint, variant = "green", icon,
}: {
  label: string; value: string | number; hint?: string; variant?: string; icon?: string;
}) {
  return (
    <div className={`${STAT_VARIANTS[variant]} rounded-2xl p-5 shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</div>
          <div className="mt-2 text-3xl font-bold">{value}</div>
          {hint && <div className="mt-1 text-xs opacity-70">{hint}</div>}
        </div>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
    </div>
  );
}

// ── ModalidadeView ────────────────────────────────────────────────────────
function ModalidadeView({ rows }: { rows: ObservationRow[] }) {
  const [mod, setMod] = useState<(typeof MODALIDADES)[number]>("Diálogo Formativo");
  const filtered = rows.filter((r) => r.modalidade === mod);

  const criteria = useMemo(() => {
    const map = new Map<string, { superou: number; atendeu: number; parcial: number; nao: number }>();
    filtered.forEach((r) =>
      r.rubrics.forEach((x) => {
        const c = classifyValue(x.value);
        if (!c) return;
        const entry = map.get(x.criterio) ?? { superou: 0, atendeu: 0, parcial: 0, nao: 0 };
        entry[c]++;
        map.set(x.criterio, entry);
      }),
    );
    return Array.from(map.entries()).map(([criterio, v]) => ({ criterio, ...v }));
  }, [filtered]);

  const distribution = useMemo(() => {
    const counts = { superou: 0, atendeu: 0, parcial: 0, nao: 0 };
    filtered.forEach((r) =>
      r.rubrics.forEach((x) => {
        const c = classifyValue(x.value);
        if (c) counts[c]++;
      }),
    );
    return [
      { name: "Superou", value: counts.superou, color: STATUS_COLORS.superou },
      { name: "Atendeu", value: counts.atendeu, color: STATUS_COLORS.atendeu },
      { name: "Parcial", value: counts.parcial, color: STATUS_COLORS.parcial },
      { name: "Não atendeu", value: counts.nao, color: STATUS_COLORS.nao },
    ].filter((d) => d.value > 0);
  }, [filtered]);

  const radarData = useMemo(() => {
    return criteria.map((c) => {
      const total = c.atendeu + c.parcial + c.nao + c.superou;
      const score = total > 0 ? (c.superou * 3 + c.atendeu * 2 + c.parcial * 1) / total : 0;
      return { criterio: c.criterio.split(" ").slice(0, 3).join(" "), score: parseFloat(score.toFixed(2)) };
    });
  }, [criteria]);

  return (
    <div className="space-y-6">
      {/* Pill selectors */}
      <div className="flex flex-wrap gap-2">
        {MODALIDADES.map((m) => (
          <button
            key={m}
            id={`mod-${m.replace(/\s+/g, "-").toLowerCase()}`}
            onClick={() => setMod(m)}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-all ${
              mod === m
                ? "border-transparent shadow-md text-white"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
            style={mod === m ? { background: `linear-gradient(135deg, ${BRAND.greenDark}, ${BRAND.blue})` } : {}}
          >
            {m} · <span className="font-bold">{rows.filter((r) => r.modalidade === m).length}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhuma observação para essa modalidade." />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Bar chart */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold" style={{ color: BRAND.greenDark }}>
                  Desempenho por critério
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(280, criteria.length * 40)}>
                  <BarChart data={criteria} layout="vertical" margin={{ left: 24, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis
                      type="category" dataKey="criterio" width={200}
                      stroke="var(--muted-foreground)" fontSize={11} tick={{ fill: "var(--foreground)" }}
                    />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} />
                    <Legend />
                    <Bar dataKey="superou" stackId="a" fill={STATUS_COLORS.superou} name="Superou" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="atendeu" stackId="a" fill={STATUS_COLORS.atendeu} name="Atendeu" />
                    <Bar dataKey="parcial" stackId="a" fill={STATUS_COLORS.parcial} name="Parcial" />
                    <Bar dataKey="nao" stackId="a" fill={STATUS_COLORS.nao} name="Não atendeu" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold" style={{ color: BRAND.greenDark }}>
                  Distribuição geral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={distribution} dataKey="value" nameKey="name"
                      innerRadius={55} outerRadius={95} paddingAngle={3}
                    >
                      {distribution.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Radar */}
          {radarData.length >= 3 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold" style={{ color: BRAND.greenDark }}>
                  Radar de competências · {mod}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 11, fill: "var(--foreground)" }} />
                    <Radar
                      name="Nota média" dataKey="score" stroke={BRAND.green}
                      fill={BRAND.green} fillOpacity={0.25} strokeWidth={2}
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <ObservationList rows={filtered} />
        </>
      )}
    </div>
  );
}

// ── PersonView ────────────────────────────────────────────────────────────
function PersonView({
  rows, field, options, label,
}: {
  rows: ObservationRow[]; field: "tutor" | "formador"; options: string[]; label: string;
}) {
  const [selected, setSelected] = useState<string>(options[0] ?? "");
  const filtered = rows.filter((r) => r[field] === selected);

  const byMod = useMemo(() =>
    MODALIDADES.map((m) => {
      const subset = filtered.filter((r) => r.modalidade === m);
      const scores = subset.flatMap((r) => r.rubrics.map((x) => x.score).filter((s): s is number => s !== null));
      return {
        modalidade: m.replace(" Formativo", ""),
        total: subset.length,
        media: scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
      };
    }),
  [filtered]);

  const ranking = useMemo(() =>
    options
      .map((name) => {
        const subset = rows.filter((r) => r[field] === name);
        const scores = subset.flatMap((r) => r.rubrics.map((x) => x.score).filter((s): s is number => s !== null));
        return {
          name, total: subset.length,
          media: scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.total - a.total),
  [rows, options, field]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Selecione um {label}:</span>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id={`select-${label}`} className="w-[340px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold" style={{ color: BRAND.greenDark }}>
              Atividade por modalidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byMod}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="modalidade" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 3]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }} />
                <Legend />
                <Bar yAxisId="l" dataKey="total" fill={BRAND.green} name="Observações" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="r" dataKey="media" fill={BRAND.blue} name="Nota média" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold" style={{ color: BRAND.greenDark }}>
              Ranking de atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[260px]">
              <ul className="divide-y">
                {ranking.map((p, idx) => (
                  <li
                    key={p.name}
                    onClick={() => setSelected(p.name)}
                    className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-muted ${p.name === selected ? "bg-muted" : ""}`}
                  >
                    <span className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: idx === 0 ? BRAND.green : idx === 1 ? BRAND.blue : "#9e9e9e" }}
                      >
                        {idx + 1}
                      </span>
                      {p.name}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.total} obs</span>
                      <Badge variant="secondary" className="font-mono">{p.media.toFixed(2)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <ObservationList rows={filtered} />
    </div>
  );
}

// ── ChecklistView ─────────────────────────────────────────────────────────
function ChecklistView({ rows }: { rows: ObservationRow[] }) {
  const withChecklist = rows.filter((r) => r.checklistRealizadas || r.checklistNaoRealizadas);

  // Count most common items
  const realizadasCount = useMemo(() => {
    const map = new Map<string, number>();
    withChecklist.forEach((r) => {
      const items = r.checklistRealizadas.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean);
      items.forEach((item) => map.set(item, (map.get(item) ?? 0) + 1));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, value]) => ({ name, value }));
  }, [withChecklist]);

  const naoRealizadasCount = useMemo(() => {
    const map = new Map<string, number>();
    withChecklist.forEach((r) => {
      const items = r.checklistNaoRealizadas.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean);
      items.forEach((item) => map.set(item, (map.get(item) ?? 0) + 1));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, value]) => ({ name, value }));
  }, [withChecklist]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Realizadas */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: BRAND.greenDark }}>
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: BRAND.green }} />
              Ações Realizadas Corretamente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {realizadasCount.length === 0 ? (
              <EmptyState message="Sem dados de checklist." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, realizadasCount.length * 36)}>
                <BarChart data={realizadasCount} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={220} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill={BRAND.green} name="Ocorrências" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Não realizadas */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: "#b71c1c" }}>
              <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
              Ações NÃO Realizadas Adequadamente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {naoRealizadasCount.length === 0 ? (
              <EmptyState message="Sem dados de checklist." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, naoRealizadasCount.length * 36)}>
                <BarChart data={naoRealizadasCount} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={220} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#e53935" name="Ocorrências" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail list */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold" style={{ color: BRAND.greenDark }}>
            Registros individuais de checklist ({withChecklist.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[420px]">
            <ul className="divide-y">
              {withChecklist.map((r, i) => (
                <li key={i} className="px-6 py-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{r.formador}</span>
                    <Badge variant="outline" className="text-xs">{r.tutor}</Badge>
                    <Badge className="text-xs">{r.modalidade}</Badge>
                    <span className="text-xs text-muted-foreground">{r.dataObservacao}</span>
                  </div>
                  {r.checklistRealizadas && (
                    <div className="rounded-md border border-l-4 bg-green-50 p-3 text-sm" style={{ borderLeftColor: BRAND.green }}>
                      <div className="text-xs font-semibold uppercase text-green-800 mb-1">✓ Realizadas</div>
                      <div className="text-green-900">{r.checklistRealizadas}</div>
                    </div>
                  )}
                  {r.checklistNaoRealizadas && (
                    <div className="rounded-md border border-l-4 bg-red-50 p-3 text-sm border-l-red-500">
                      <div className="text-xs font-semibold uppercase text-red-800 mb-1">✗ Não realizadas</div>
                      <div className="text-red-900">{r.checklistNaoRealizadas}</div>
                    </div>
                  )}
                  {r.outrosRegistros && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold uppercase">Outros registros: </span>{r.outrosRegistros}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ── ObservationList ───────────────────────────────────────────────────────
function ObservationList({ rows }: { rows: ObservationRow[] }) {
  if (rows.length === 0) return <EmptyState message="Nenhuma observação para os filtros selecionados." />;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold" style={{ color: BRAND.greenDark }}>
          Registros de observação ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <ul className="divide-y">
            {rows.map((r, i) => (
              <li key={i} className="px-6 py-5 transition-colors hover:bg-muted/30">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground">{r.formador}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Tutor: <span className="font-medium text-foreground">{r.tutor}</span>
                      {r.dataObservacao && ` · Observação: ${r.dataObservacao}`}
                      {r.dataFeedback && ` · Feedback: ${r.dataFeedback}`}
                    </div>
                    {r.formadorEmail && (
                      <div className="text-xs text-muted-foreground">{r.formadorEmail}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className="text-white text-xs"
                      style={{ background: r.modalidade === "Diálogo Formativo" ? BRAND.green : r.modalidade === "Devolutiva" ? BRAND.blue : BRAND.teal }}
                    >
                      {r.modalidade}
                    </Badge>
                    {r.avgScore !== null && (
                      <Badge variant="outline" className="font-mono text-xs">
                        média {r.avgScore.toFixed(2)}
                      </Badge>
                    )}
                    {r.linkAcaoObservada && r.linkAcaoObservada.startsWith("http") && (
                      <a href={r.linkAcaoObservada} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline hover:text-blue-800">
                        Ver ação ↗
                      </a>
                    )}
                    {r.linkFeedback && r.linkFeedback.startsWith("http") && (
                      <a href={r.linkFeedback} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline hover:text-blue-800">
                        Ver feedback ↗
                      </a>
                    )}
                  </div>
                </div>

                {(r.destaques || r.desenvolver) && (
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    {r.destaques && (
                      <div className="rounded-lg border bg-green-50 p-3" style={{ borderLeftWidth: 4, borderLeftColor: BRAND.green }}>
                        <div className="text-xs font-semibold uppercase text-green-800 mb-1">⭐ Habilidades em destaque</div>
                        <div className="text-green-900">{r.destaques}</div>
                      </div>
                    )}
                    {r.desenvolver && (
                      <div className="rounded-lg border bg-amber-50 p-3" style={{ borderLeftWidth: 4, borderLeftColor: BRAND.amber }}>
                        <div className="text-xs font-semibold uppercase text-amber-800 mb-1">🔧 A desenvolver</div>
                        <div className="text-amber-900">{r.desenvolver}</div>
                      </div>
                    )}
                  </div>
                )}

                {r.encaminhamentos && (
                  <div className="mt-3 rounded-lg border bg-blue-50 p-3 text-sm" style={{ borderLeftWidth: 4, borderLeftColor: BRAND.blue }}>
                    <span className="text-xs font-semibold uppercase text-blue-800">📌 Encaminhamentos: </span>
                    <span className="text-blue-900">{r.encaminhamentos}</span>
                  </div>
                )}

                {r.outrosRegistros && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold uppercase">Outros registros: </span>{r.outrosRegistros}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        <div className="text-3xl mb-2">📭</div>
        {message}
      </CardContent>
    </Card>
  );
}
