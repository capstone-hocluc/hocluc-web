# Mentor chat frontend

Implementation branch: `feature/mentor-student-chat`. Worktree: `W:/CapstoneProject/.worktrees/mentor-chat-fe`.

Enable with `VITE_MENTOR_CHAT_ENABLED=true` only when the chat backend is available. The default is disabled (`VITE_MENTOR_CHAT_ENABLED=false`); no production code path substitutes fixture conversations, and HTTP 404/501/network failures remain visible to the user. The chat screens, services and socket must not be reached while the flag is off.

## Baseline (phase 1, 2026-10-11)

- Branch `feature/mentor-student-chat`, HEAD `0041c127637cfe6c5da99aede6ebda1768e05bb1`, all chat code present as uncommitted worktree changes; the original checkout is untouched.
- DTO/path review against the architecture contract: REST prefix `/api/v1/chat`; `GET /capabilities`; `GET/POST /conversations`; `GET /conversations/{id}`; `GET/POST /conversations/{id}/messages`; `PUT /read`; `PATCH /status`; `GET /management/conversations`; `PUT /management/conversations/{id}/assignment`; `GET /management/mentors`; `GET/PUT /mentors/{id}/working-hours`; attachment `upload-url` → staging PUT → `complete` → `download-url`. DTOs in `src/types/chat.ts`, paths in `src/services/chatService.ts`. No contradictions found beyond the extra `GET /management/conversations/{id}` queue-detail call the console uses instead of a management-route detail in the contract.
- Additional FE contract notes: `GET /api/v1/chat/management/conversations/{id}` returns the same metadata DTO for queue detail; `GET /api/v1/chat/subjects` returns `ApiResponse<{id:string,name:string}[]>`; management responses are metadata only and the FE never reads transcript fields from them.
- Backend status: **not proven to exist**. FE service coverage does not imply BE endpoints. All FE phases run against isolated Playwright route fixtures; live integration is phase 6.
- Policy kept: account required; an active PURCHASED enrollment is required to create/send; every subject can be asked; expired students still read history; a Mentor keeps answering open requests. Assignment-by-group and `ADMIN_ENROLLED` remain plan assumptions until the backend settles them.

## URLs and surfaces

Student URLs: `/student/chat` and `/student/chat/{UUID}`. Mentor: `/mentor/chat?conversationId={UUID}`. Staff/Admin: `/{role}/chat-queue?conversationId={UUID}`. Manager: `/manager/chat-monitoring?conversationId={UUID}`. Staff/Admin/Manager screens use management metadata endpoints only; invalid UUIDs never produce a detail request.

## Transport

REST prefix `/api/v1/chat`; WebSocket `/ws/chat`, STOMP user queue `/user/queue/chat-events`, typing destination `/app/chat/typing`. Message creation is REST with a stable `clientMessageId`; events contain metadata only and trigger authenticated REST reconciliation. A single-flight token refresh is shared by HTTP and the socket; the socket never receives message bodies or signed URLs. Attachment staging URLs upload bytes before `/complete` produces the immutable attachment ID; the JWT is never sent to storage. Backend authorization remains authoritative for `canCreate` and `canSend`.

The visible chat workspace reconciles both inbox and selected detail every 15 seconds even while STOMP is connected. This safety net repairs missed events and discovers silent access revocation independently of inbox filters/pages; unchanged detail does not refetch message history. Hidden tabs do not poll, and returning to the tab triggers reconciliation. Read acknowledgments are capped by the contiguous REST batch committed with the rendered messages, never by a sparse POST sequence. Failed/stale catch-up cannot advance that read boundary; changing selection/identity or purging a 403/404 clears it.

## UI

The UI references the official NextAdmin Chats layout (<https://demo.nextadmin.co/chats>). The local NextAdmin source has no chat screen to copy; console screens use the existing console adapters and tokens, while student screens keep student styling. The composer honors the contract's `capabilities.canSend`: when it is `false` the composer and attachment picker are disabled and the server-provided reason is shown; an absent field means allowed (backward compatible), and the backend remains authoritative. A permanently failed pending send can be cancelled ("Hủy tin chưa gửi") without leaving the conversation.

## Verification

Fixture verification uses `npm run test:e2e:chat` and `npm run test:e2e:core-crud`, without a database connection. Fixture success alone does not prove live transport, storage or authorization.

Real integration is owned by `scripts/chat-live-browser-test.ps1`, `playwright.live.config.ts` and `tests/e2e/chat-live.spec.ts`, paired with the backend's `scripts/chat-live-test.ps1 -Browser`. `vite.live.config.ts` forwards same-origin API/STOMP traffic to the fresh disposable backend; private storage requests remain real. Deliberate pacing respects the shared loopback IP's existing quota. This topology is not evidence that compressed cross-origin/shared-NAT workloads avoid 429.

Phase 5 gate after audit fixes (2026-10-11, HEAD `0041c127637cfe6c5da99aede6ebda1768e05bb1`, code uncommitted): `npx tsc -b`, `npx tsc --noEmit -p tsconfig.e2e.json`, `npm run build` pass; `npm run lint` 0 errors (3 baseline warnings outside chat); `npm run test:e2e:chat` 61 passed and `npm run test:e2e:core-crud` 28 passed. Independent review found no remaining blocker. Catch-up uses a request-local cursor and commits it with the complete valid batch, so failed later pages and stale selections cannot skip messages. Background inbox reconciliation reloads the loaded page depth with the active filter and replaces rows/cursor together. Lost-response coverage now commits on the fixture server before aborting, proving same-key retry does not duplicate the committed message.

Test-only extension: full chat suite now **63 passed**, e2e typecheck/lint/diff-check exit 0. No production source changes in this extension. The connected-socket token-rotation test checks old DISCONNECT, new CONNECT/SUBSCRIBE authorization, preserved draft, and authenticated REST reconciliation after a fresh socket event. The STOMP fixture now acknowledges DISCONNECT receipts.

User approved **24:00 as end of day**. The Mentor hours editor offers an end-of-day checkbox with readonly `24:00`; unchecking requires entering a regular end time. Start values allow 00:00–23:59, end adds exactly 24:00, weekdays are ISO 1–7, and intervals are half-open and non-overlapping. Sunday 22:00–24:00 and Monday 00:00–01:00 save/load without a missing minute. BE must parse day-relative minutes (end=1440), preserve 24:00 in responses, and implement availability using this convention.

Validation on 2026-10-11: **66 chat passed**, app/e2e typecheck, lint, build and diff-check exit 0; lint retained 3 baseline warnings. Independent review at that point found no blocker; the 390px hours modal screenshot was checked.

Current evidence and remaining rollout constraints: `W:/CapstoneProject/plans/261010-2302-mentor-student-chat/reports/261012-live-integration-progress.md`. The same-origin paced real-browser scenario has passed; this does not replace backend expiry/storage tests or certify load, multinode security, every browser edge case, or business-policy rollout. Feature flags remain disabled outside isolated test processes; no merge, push or deployment is implied.
## Frontend integration status (2026-10-13)

The mentor chat frontend is integrated in this branch and is ready to merge into `dev`. The student chat route, mentor workspace, management queue and assignment screen are wired into the app navigation and existing UI systems. The chat feature flag remains `VITE_MENTOR_CHAT_ENABLED=false` by default; enable it in an environment only after the backend chat feature is configured.

Management mentor selection is subject-scoped: `GET /api/v1/chat/management/mentors` includes the selected `conversationId`, so the backend resolves the subject and only returns eligible mentors. Attachment downloads use the authenticated API client to fetch protected content with the current bearer token; signed storage URLs are validated against the API origin and expected content route before use.

Verification on 2026-10-13: `npx tsc -b`, `npm run build`, `npm run test:e2e:chat` (**73 passed**) and `npm run test:e2e:core-crud` (**28 passed**) all pass. `npm run lint` exits successfully with 0 errors and 3 existing warnings in unrelated files. E2E runs use fixtures; a live backend integration was not run in this verification.
