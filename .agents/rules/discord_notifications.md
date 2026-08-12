# Rule: Discord Notifications Protocol for AI Agents

Whenever an AI assistant (Codex, Claude Code, or Antigravity) completes a task, opens a pull request, or requests a `main` branch sync/review, it MUST post an embed notification to Discord following these exact rules:

1. **Target Channel**: `#💬-❙-general` (ID: `1536934842741301321`).
2. **Embed Title**: `<Agent Name> | <User>`
   - Examples: `Claude Code | pipe_.os`, `Antigravity | pipe_.os`, `Codex | Juvko0`
3. **Cross-Tagging Logic**:
   - If the task was requested by **Pipe** (`pipe_.os`), tag **Joaquín** (`<@ID_JOAQUIN>`).
   - If the task was requested by **Joaquín** (`Juvko0`), tag **Pipe** (`<@1150176313974460457>`).
4. **Embed Styling**:
   - **Color**: Hex `#10B981` for completed tasks, `#F59E0B` for pending review, `#EF4444` for errors/blocked.
   - **Description**: Must start by tagging the teammate, followed by a concise summary of what was done, affected branch/PR, and clear next steps. Use clean Discord markdown (e.g. `AGENTS.md`) or GitHub URLs (`https://github.com/...`). Never insert local `file:///` links into Discord messages.
   - **Footer**: `CEOUBB LMS • Colaboración de Agentes`
