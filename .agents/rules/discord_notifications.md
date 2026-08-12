# Rule: Discord Notifications Protocol for AI Agents

**CRITICAL REQUIREMENT**: An AI assistant (Codex, Claude Code, or Antigravity) MUST ONLY post a message/embed to Discord or tag a teammate WHEN THE USER EXPLICITLY REQUESTS IT in their prompt (e.g., *"when done, post to Discord tagging Joaquín"* or *"notify on Discord"*). If the user DOES NOT explicitly ask to send a Discord message, DO NOT post anything to Discord.

When explicitly requested by the user, the agent MUST format the notification according to these exact rules:

1. **Target Channel**: `#💬-❙-general` (ID: `1536934842741301321`).
2. **Embed Title**: `<Agent Name> | <User>`
   - Examples: `Claude Code | pipe_.os`, `Antigravity | pipe_.os`, `Codex | Juvko0`
3. **Cross-Tagging Logic**:
   - If the task was requested by **Pipe** (`pipe_.os`), tag **Joaquín** (`<@662149246631542816>`).
   - If the task was requested by **Joaquín** (`Juvko0`), tag **Pipe** (`<@1150176313974460457>`).
4. **Embed Styling**:
   - **Color**: Hex `#10B981` for completed tasks, `#F59E0B` for pending review, `#EF4444` for errors/blocked.
   - **Description**: Must start by tagging the teammate, followed by a concise summary of what was done, affected branch/PR, and clear next steps. Use clean Discord markdown (e.g., `AGENTS.md`) or GitHub URLs (`https://github.com/...`). Never insert local `file:///` links into Discord messages.
   - **Footer**: `CEOUBB LMS • Colaboración de Agentes`
