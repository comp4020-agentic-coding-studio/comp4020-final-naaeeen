# Parent reconciliation of the workload zone-header fix

The parent inspected the actual helper diff and realHTTP spec. Fresh-context
GPT-6 Astra high independently found no actionable defect: actual request() uses
the extracted builder, whose only semantic change is the current durable-zone
header. Subscription updates the actor snapshot before subsequent requests.
Schedules, roles, bodies, limits, failure categories and server guards are intact.

RED and GREEN exercise the real HTTP/socket service and SQLite counts. Missing
and wrong zones stay409 with no mutation or receipt; current zone changes from409
to200 and creates exactly one revision/receipt. Both services close. No raw IDs,
tokens or request bodies are published. This check covers one controller/bedroom;
full mixed transitions, reconnects and resource acceptance remain separate.
