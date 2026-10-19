export interface ActivityRecord {
  at: string;
  actor: string | null;
  action: string;
  outcome: string;
  transport?: "http" | "socket";
  commandId?: string;
  houseId?: string;
  zoneId?: string;
  sequence?: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTION = /^[a-z][a-z0-9._/:-]{0,63}$/;
const OUTCOME = /^[A-Za-z][A-Za-z0-9_:-]{0,47}$/;

function matches(value: unknown, pattern: RegExp): value is string {
  // A JavaScript $ anchor alone also accepts a position before a final newline.
  return typeof value === "string" && pattern.exec(value)?.[0] === value;
}

function uuid(value: unknown): string | undefined {
  return matches(value, UUID) ? value : undefined;
}

function correlationFields(command: unknown, house: unknown, zone: unknown): Partial<ActivityRecord> {
  const metadata: Partial<ActivityRecord> = {};
  const commandId = uuid(command), houseId = uuid(house);
  const zoneId = zone === "lounge" ? zone : uuid(zone);
  if (commandId !== undefined) metadata.commandId = commandId;
  if (houseId !== undefined) metadata.houseId = houseId;
  if (zoneId !== undefined) metadata.zoneId = zoneId;
  return metadata;
}

/** Callers supply server-resolved identity and server-owned action/outcome labels. */
export function createActivityLogger(
  sink: (record: ActivityRecord) => void = record => console.log(JSON.stringify(record)),
  now: () => Date = () => new Date(),
): (input: Record<string, unknown>) => void {
  return input => {
    const record: ActivityRecord = {
      at: now().toISOString(),
      actor: uuid(input.actor) ?? null,
      action: matches(input.action, ACTION) ? input.action : "activity.unknown",
      outcome: matches(input.outcome, OUTCOME) ? input.outcome : "unknown",
      ...correlationFields(input.commandId, input.houseId, input.zoneId),
    };
    if (input.transport === "http" || input.transport === "socket") record.transport = input.transport;
    if (typeof input.sequence === "number" && Number.isSafeInteger(input.sequence) && input.sequence >= 0)
      record.sequence = input.sequence;
    try {
      sink(record);
    } catch {
      // Logging must not turn an already committed action into a reported failure.
    }
  };
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

/** Correlation only: body identity, contents, outcome and credentials are never copied. */
export function activityMetadata(raw: unknown): Partial<ActivityRecord> {
  const command = object(raw);
  if (!command) return {};
  const payload = object(command.payload);
  return correlationFields(
    command.commandId ?? command.id,
    command.houseId,
    command.zoneId ?? payload?.zoneId ?? payload?.roomId,
  );
}
