# Feature inventory

Statuses are cumulative: **OBSERVED** = reference evidence; **IMPLEMENTED** = project code; **TESTED** = an executed test; **APPROXIMATED** = explicit replacement behavior; **BLOCKED** = unavailable reference evidence or unfinished scope.

| Feature | Status | Evidence / implementation |
| --- | --- | --- |
| Arena lobby, navy/gold panels, two columns | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | REA lobby + local viewport screenshots; existing app shell retained |
| Three mode names, round counts and time limits | OBSERVED, IMPLEMENTED, TESTED | REA accessibility; 7/10/5-round two-browser games |
| Question generation/rendering | IMPLEMENTED, TESTED, APPROXIMATED | Existing project banks; no original game questions observed |
| Server scoring and timers | IMPLEMENTED, TESTED, APPROXIMATED | 100 points correct + up to 50 for speed; server deadline |
| 20/100/300 wager tiers, locked/selected states | OBSERVED, IMPLEMENTED, TESTED | Actual XP balance, server funds check |
| Custom wager | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | Integer 10–1000, explicit local limit |
| 70% win reward / full wager loss | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | Display observed; transaction lifecycle is local design |
| XP holds, refunds, atomic settlement and level update | IMPLEMENTED, TESTED | Isolated MySQL ledger/concurrency/rollback tests |
| XP history and tier progress | IMPLEMENTED, TESTED | Per-user ledger and actual balance; no copied XP values |
| Quick matchmaking | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | Server queue pairs equal mode/wager; two actual accounts, no bots |
| Search cancel and timeout | IMPLEMENTED, TESTED, APPROXIMATED | 60s search, refund; expiry worker and request recovery |
| Private create/join, room code, host/guest | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | Actual persistent rooms; exact original rules unavailable |
| Ready/start, full/invalid/expired rooms | IMPLEMENTED, TESTED, APPROXIMATED | Both ready; host starts; server validation |
| Round answers, feedback, results, replay | IMPLEMENTED, TESTED, APPROXIMATED | Two-browser complete games, server-owned score |
| Reload/reconnect and duplicate answers | IMPLEMENTED, TESTED | Persistence, network probe and MySQL idempotency tests |
| Opponent leaves/disconnects | IMPLEMENTED, TESTED, APPROXIMATED | Explicit leave forfeits; transient disconnect may rejoin, timers continue |
| Champion and full ranking | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | Indexed local match aggregates; no copied profiles |
| Match history | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | History action/route observed; detail design is local |
| Sound toggle | OBSERVED, IMPLEMENTED, TESTED, APPROXIMATED | Original audio unavailable; local synthesized round/result feedback |
| Invitation quiet mode, invitations | OBSERVED, BLOCKED | No invitation system reconstructed; no decorative toggle added |
| Dialogs, Escape, focus, loading, empty/error states | IMPLEMENTED, TESTED, APPROXIMATED | Shared modal motion + Boneyard; reference dialogs unavailable |
| Five responsive viewports | IMPLEMENTED, TESTED; reference BLOCKED | Local overflow assertions + screenshots; original only 1920×900 |
| Original API schemas and hidden algorithms | BLOCKED | Not inferred as facts; no original endpoints used |
| Production migration/rollout | BLOCKED | Intentionally requires owner review and backup |
