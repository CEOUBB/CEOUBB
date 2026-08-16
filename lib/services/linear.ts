const LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";

export function getLinearApiKey(): string | null {
  return process.env.LINEAR_API_KEY || null;
}

export interface LinearIssueDetails {
  id: string;
  title: string;
  description?: string;
  url?: string;
  priority?: number;
  status?: string;
  assignee?: string;
}

export interface LinearIssueItem {
  id: string;
  title: string;
  status?: string;
  assignee?: string;
}

/**
 * Consulta información detallada de un issue específico en Linear por su identificador (ej. CEO-38).
 */
export async function getLinearIssue(id: string): Promise<LinearIssueDetails | null> {
  const apiKey = getLinearApiKey();
  if (!apiKey) return null;

  try {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          identifier
          title
          description
          url
          priority
          state { name type }
          assignee { name }
        }
      }
    `;

    const res = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables: { id: id.toUpperCase() } }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const issue = data?.data?.issue;
    if (!issue) return null;

    return {
      id: issue.identifier,
      title: issue.title,
      status: issue.state?.name,
      assignee: issue.assignee?.name || "Sin asignar",
      priority: issue.priority,
      url: issue.url,
      description: issue.description ? issue.description.slice(0, 500) : "Sin descripción",
    };
  } catch (err) {
    console.warn(`⚠️ Error consultando issue '${id}' en Linear:`, err);
    return null;
  }
}

/**
 * Lista los issues activos y pendientes del backlog o sprint en Linear.
 */
export async function listActiveLinearIssues(limit: number = 10): Promise<LinearIssueItem[]> {
  const apiKey = getLinearApiKey();
  if (!apiKey) return [];

  const safeLimit = Math.max(1, Math.min(limit, 50));

  try {
    const query = `
      query GetActiveIssues($limit: Int!) {
        issues(filter: { state: { type: { in: ["started", "unstarted", "backlog"] } } }, first: $limit) {
          nodes {
            identifier
            title
            state { name }
            assignee { name }
          }
        }
      }
    `;

    const res = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables: { limit: safeLimit } }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const nodes = data?.data?.issues?.nodes || [];

    return nodes.map((i: { identifier: string; title: string; state?: { name: string }; assignee?: { name: string } }) => ({
      id: i.identifier,
      title: i.title,
      status: i.state?.name || "Pendiente",
      assignee: i.assignee?.name || "Sin asignar",
    }));
  } catch (err) {
    console.warn("⚠️ Error listando issues activos de Linear:", err);
    return [];
  }
}

/**
 * Lista los issues completados recientemente en Linear.
 */
export async function listCompletedLinearIssues(limit: number = 5): Promise<LinearIssueItem[]> {
  const apiKey = getLinearApiKey();
  if (!apiKey) return [];

  const safeLimit = Math.max(1, Math.min(limit, 50));

  try {
    const query = `
      query GetCompletedIssues($limit: Int!) {
        issues(filter: { state: { type: { eq: "completed" } } }, first: $limit) {
          nodes {
            identifier
            title
            state { name }
            assignee { name }
          }
        }
      }
    `;

    const res = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query, variables: { limit: safeLimit } }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const nodes = data?.data?.issues?.nodes || [];

    return nodes.map((i: { identifier: string; title: string; state?: { name: string }; assignee?: { name: string } }) => ({
      id: i.identifier,
      title: i.title,
      status: i.state?.name || "Completada",
      assignee: i.assignee?.name || "Sin asignar",
    }));
  } catch (err) {
    console.warn("⚠️ Error listando issues completados de Linear:", err);
    return [];
  }
}
