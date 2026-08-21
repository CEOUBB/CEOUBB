## Why

Linear issue **CEO-55** captures the clearest product gap reported by UBB teachers: the current plain-text classroom post body is too rigid for code-heavy and mathematical subjects. Teachers in Estática, EDO, Termodinámica and MATLAB need to publish source code and equations without dropping to arbitrary HTML, while every enrolled student must remain protected from stored XSS.

CEOUBB already ships KaTeX in the offline study library and Android loads the same remote Next.js portal as the web. The change can therefore add one bounded, shared renderer without a data migration, a native duplicate or a new dependency.

## What Changes

- Parse a bounded Markdown subset into a typed, HTML-free document model and render it exclusively as escaped React nodes.
- Highlight fenced MATLAB, Python, C++ and SQL blocks with a deterministic local tokenizer; unknown languages remain escaped plain code.
- Render inline and display formulas with the vendored KaTeX runtime using `trust: false`, strict parsing and expansion/size limits, preserving the TeX source on failure.
- Replace the teacher's plain textarea and prompt-based edit flow with a controlled editor whose live preview uses the exact published renderer.
- Validate body length and external-link schemes at the write boundary while preserving legacy plain-text posts and existing Firestore fields.
- Exercise the same feature in the Android Capacitor app through its remote-first `https://ceoubb.com` WebView.

## Capabilities

### New Capabilities

- `classroom/rich-posts`: Safe Markdown classroom posts, technical code blocks, KaTeX formulas, live teacher preview, legacy compatibility and web/Android rendering parity.

### Modified Capabilities

<!-- None. The persisted `body` contract stays a string and the classroom authorization model does not change. -->

## Impact

**Code**

- `lib/rich-text.ts` — bounded parser, URL policy and syntax tokenization.
- `app/views/classroom/RichText.tsx` — shared escaped renderer and vendored KaTeX adapter.
- `app/views/classroom/RichPostEditor.tsx` — controlled editor and deferred live preview.
- `app/views/classroom/{ClassroomView,MaterialsSection,PostsSection}.tsx` — assets, creation, editing and published rendering.
- `app/views/classroom/use-classroom-handlers.ts` and `lib/firebase/posts.ts` — success-aware writes and boundary validation.
- `app/globals.css` — responsive reading, code, formula and editor styles.
- `tests/rich-text.test.ts`, `package.json` and `.agents/.test-hashes.json` — executable acceptance coverage and test-lock registration.
- `PLAN.md` — active handoff and verification status.

**Data**

- No migration and no new Firestore collection. `body` remains a string, so historical records keep their exact stored representation.

**Operations**

- No new package or external CDN. KaTeX loads from the existing same-origin vendored library assets.

**Non-goals**

- No teacher-authored raw HTML, embedded scripts, iframes or arbitrary KaTeX trust extensions.
- No full CommonMark/GFM implementation, Markdown tables, embedded image uploads or collaborative editing.
- No native Android renderer or duplicated library asset tree.
- No Firestore rule, authentication, enrollment, notification or gradebook changes.
