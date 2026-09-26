# VitalMind endpoint behavior

Reviewed against `module_integration_brief.pdf` (pages 1–3) and `auth_login_brief.pdf` (pages 1–3), supplied on 26 September 2026.

## Results

`GET /internal/patients/{patient_id}/results` requires `x-api-key`.

- Resolve the external patient ID through `vitalmind_patients.auth_user_id` before reading `game_sessions.user_id`.
- Return the latest day with eligible training results, including every eligible round on that day. Shared completion rules exclude tutorial, explicitly failed, and unfinished attempts; legacy completion rows remain supported.
- An optional `date=YYYY-MM-DD` selects a specific day. Invalid dates return 400. An unknown/unlinked patient or day without eligible results returns 404. Database failures return 500 rather than an empty result.
- Page database reads with deterministic ordering. Requested days are bounded in the database. Records dated after the request started are excluded from that response.
- Reads do not update `sent_to_vitalmind` or `sent_at`. These fields are not needed by the pull contract. The old undocumented `include_sent` parameter has no effect; repeated reads return the same available results.
- Keep the existing six `brain_stats` fields and game IDs. No game scoring formulas or stored records are changed.
- Use actual recorded maxima; absent/nonpositive maxima become `null`, never a guessed 100. Preserve legitimate zero scores. Missing/invalid scores become `null`.
- Use positive stored durations, otherwise recover known recorded elapsed-time fields. A zero stored by the save action without a measured duration becomes `null`. Explicitly recorded zero milliseconds remains zero. No time limit, target time, reaction-time average, or inferred wall time is substituted for elapsed duration.
- Authentication precedes rate limiting. The configured per-key limit applies per server instance. All responses disable caching.

## Contract details still requiring confirmation

The briefs do not define these details. They must be checked with VitalMind before production integration:

1. **Nullable metrics:** the example shows numeric `score`, `max_score`, and `duration_seconds`, but gives no schema for unavailable metrics or unbounded games. This implementation uses JSON `null`. The receiving API must support that or agree on another honest representation; do not restore fabricated maxima or zero times.
2. **Day timezone:** UTC grouping is retained for compatibility. Confirm whether the receiving service expects Bangkok calendar days instead.
3. **Response `user_id`:** existing behavior echoes the external URL `patient_id`. The auth brief separately shows an upstream `user_id`, which this mapping does not store. Confirm what the results field means before changing it; do not substitute the Supabase Auth UUID by guesswork.
4. **Game identifiers / eligibility:** the brief gives an illustrative `memory_match` identifier, not a complete accepted identifier list or rules for failed rounds. Current output uses the existing `game-XX-*` IDs and shared completed-training eligibility.

## Profile updates

`POST /internal/patient-updated` now accepts optional `current.user_type`. The brief says this field is present on registration and omitted on later name changes.

Registration notifications create the existing mapping row if absent, without creating an Auth user/session or replacing a linked identity. Duplicate registration notifications preserve the mapping. Both registration and later name changes use the existing `update_vitalmind_patient_profile` RPC and synchronize linked Auth/local profiles. Unknown name-only updates still return 404 because no registration type or verified identity is available.

No migration was introduced. Deployment still requires the mapping table to support unlinked rows and the existing RPC documented in `supabase setup for auth.md`. Those deployed definitions were not accessible in this checkout. The existing local identity provisioning code already inserts a mapping before attaching its Auth user.

## Verification and remaining deployment check

Run `npm run test:vitalmind` for offline tests exercising the actual route handlers with a database double. The tests do not contact Supabase or VitalMind and do not load secrets. TypeScript and lint should also pass.

After resolving the contract details above, test in staging: registration notification before first launch; verified launch; one completed game; two identical result reads; profile rename. Check real database permissions and RPC behavior, not just mocked responses.

The browser login still calls the deployed Supabase `vitalmind-auth` function. Its source is absent from this checkout. Neither inspecting the unused local verification helper nor passing route tests verifies that deployed function's single-use token exchange or session issuance.
