# Core CRUD UI probes

Run `npm ci`, then `npm run test:e2e:core-crud` (requires installed Google Chrome). The command typechecks the test fixtures before running Playwright.

- Starts its own Vite server at `http://127.0.0.1:5174`; refuses to reuse a server already on that port.
- Overrides the API origin to an unreachable loopback address. Every page API request is fulfilled by a fail-closed fixture, including profile/role reads. There are no real credentials or account mutations.
- Unmatched requests, page errors and unexpected console errors fail the tests. Negative HTTP/network responses are explicitly expected.
- Tests cover category create/edit, metadata preservation, conflict handling, a committed mutation whose response is lost, SECTION metadata creation, publication rejection, phase ordering/SECTION link IDs/instructor assignment, and Manager read-only views at 390px.
- Reports, failure traces and screenshots are written to ignored `.pi/qa/core-crud/`.

These are **mocked UI workflow tests**, not backend integration, authentication proof, payment/entitlement verification or a full end-to-end purchase test.

The separate BE probe is `../HocLuc/scripts/core-crud-postgres-test.ps1`. It creates and removes only its own disposable PostgreSQL 15 container (using an already-present image), binds to a dynamically chosen loopback port, uses no volumes, and runs an opt-in JPA slice without application `.env`, Redis/Kafka/mail/payment services. It refuses a remote Docker engine or a non-test JDBC URL.
