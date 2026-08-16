const GITHUB_API_BASE = "https://api.github.com/repos/CEOUBB/CEOUBB";

function getGitHubHeaders(customAccept?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: customAccept || "application/vnd.github.v3+json",
    "User-Agent": "CEOUBB-Backend-Services",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return headers;
}

export interface GitHubCommitItem {
  sha: string;
  hash: string;
  author: string;
  message: string;
}

export interface GitHubPullRequestItem {
  number: number;
  title: string;
  author: string;
  branch: string;
  state: string;
  url: string;
}

export interface GitHubPullRequestDetails {
  number: number;
  title: string;
  author: string;
  branch: string;
  baseBranch: string;
  state: string;
  url: string;
  html_url: string;
  head?: { ref: string };
  base?: { ref: string };
}

export interface GitHubCommentItem {
  body: string;
  author: string;
  created_at?: string;
}

export interface WorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface WorkflowRunDetails {
  id: number;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  headSha: string;
  commitMessage: string;
  actor: string;
  steps: WorkflowStep[];
}

/**
 * Obtener commits recientes desde la API de GitHub en la rama principal o repositorio.
 */
export async function getRecentCommits(count: number = 5): Promise<GitHubCommitItem[]> {
  try {
    const safeCount = Math.max(1, Math.min(count, 50));
    const res = await fetch(`${GITHUB_API_BASE}/commits?per_page=${safeCount}`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map(
      (c: { sha?: string; commit?: { author?: { name?: string }; message?: string } }) => {
        const fullSha = c.sha || "";
        const shortSha = fullSha.slice(0, 7) || "unknown";
        return {
          sha: shortSha,
          hash: shortSha,
          author: c.commit?.author?.name || "Desarrollador",
          message: c.commit?.message?.split("\n")[0] || "",
        };
      }
    );
  } catch (err) {
    console.warn("⚠️ Error consultando commits en GitHub API:", err);
    return [];
  }
}

/**
 * Listar Pull Requests abiertos, cerrados o todos en el repositorio CEOUBB/CEOUBB.
 */
export async function listPullRequests(
  state: "open" | "closed" | "all" = "open",
  limit: number = 5
): Promise<GitHubPullRequestItem[]> {
  try {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const res = await fetch(`${GITHUB_API_BASE}/pulls?state=${state}&per_page=${safeLimit}`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map(
      (p: {
        number: number;
        title: string;
        user?: { login?: string };
        state: string;
        html_url: string;
        head?: { ref?: string };
      }) => ({
        number: p.number,
        title: p.title,
        author: p.user?.login || "Desconocido",
        branch: p.head?.ref || "main",
        state: p.state,
        url: p.html_url,
      })
    );
  } catch (err) {
    console.warn("⚠️ Error consultando Pull Requests en GitHub API:", err);
    return [];
  }
}

/**
 * Obtener detalles completos de un Pull Request por su número.
 */
export async function getPullRequest(
  number: number | string
): Promise<GitHubPullRequestDetails | null> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/pulls/${number}`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      number: data.number,
      title: data.title,
      author: data.user?.login || "Desconocido",
      branch: data.head?.ref || "main",
      baseBranch: data.base?.ref || "main",
      state: data.state,
      url: data.html_url,
      html_url: data.html_url,
      head: data.head,
      base: data.base,
    };
  } catch (err) {
    console.warn(`⚠️ Error consultando PR #${number} en GitHub API:`, err);
    return null;
  }
}

/**
 * Obtener el diff unificado en formato de texto de un Pull Request.
 */
export async function getPullRequestDiff(number: number | string): Promise<string> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/pulls/${number}`, {
      headers: getGitHubHeaders("application/vnd.github.v3.diff"),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return "";
    return await res.text();
  } catch (err) {
    console.warn(`⚠️ Error obteniendo diff de PR #${number}:`, err);
    return "";
  }
}

/**
 * Obtener comentarios de discusión de un Pull Request / Issue.
 */
export async function getPullRequestComments(
  number: number | string
): Promise<GitHubCommentItem[]> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}/issues/${number}/comments`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 0 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map(
      (c: { body?: string; user?: { login?: string }; created_at?: string }) => ({
        body: c.body || "",
        author: c.user?.login || "Desconocido",
        created_at: c.created_at,
      })
    );
  } catch (err) {
    console.warn(`⚠️ Error obteniendo comentarios de PR #${number}:`, err);
    return [];
  }
}

/**
 * Obtener el estado del último flujo de trabajo (GitHub Actions) en la rama especificada.
 */
export async function getLatestWorkflowRun(
  branch: string = "main"
): Promise<WorkflowRunDetails | null> {
  try {
    const runsRes = await fetch(`${GITHUB_API_BASE}/actions/runs?branch=${branch}&per_page=1`, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 0 },
    });

    if (!runsRes.ok) return null;
    const runsData = await runsRes.json();
    const latestRun = runsData?.workflow_runs?.[0];
    if (!latestRun) return null;

    let steps: WorkflowStep[] = [];
    if (latestRun.jobs_url) {
      try {
        const jobsRes = await fetch(latestRun.jobs_url, {
          headers: getGitHubHeaders(),
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 0 },
        });

        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          const verifyJob = jobsData?.jobs?.[0];
          const relevantSteps = (verifyJob?.steps || []).filter((s: { name: string }) =>
            [
              "Check Firebase Functions syntax",
              "TypeScript typecheck",
              "Lint code",
              "Run test suite",
            ].includes(s.name)
          );

          steps = relevantSteps.map(
            (s: { name: string; status: string; conclusion: string | null }) => ({
              name: s.name,
              status: s.status,
              conclusion: s.conclusion,
            })
          );
        }
      } catch {
        // Ignorar fallo de detalle de jobs
      }
    }

    return {
      id: latestRun.id,
      status: latestRun.status,
      conclusion: latestRun.conclusion,
      htmlUrl: latestRun.html_url,
      headSha: latestRun.head_sha?.slice(0, 7) || "commit",
      commitMessage: latestRun.head_commit?.message?.split("\n")[0] || "Sin mensaje",
      actor: latestRun.actor?.login || "Desarrollador",
      steps,
    };
  } catch (err) {
    console.warn("⚠️ Error consultando último workflow run de GitHub Actions:", err);
    return null;
  }
}
