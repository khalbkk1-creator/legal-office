import re, sys
p = "src/lib/accounting.ts"
s = open(p, encoding="utf-8").read()
old_sig = "  lines: { accountId: string; debit?: number; credit?: number; description?: string }[];\n}) {"
new_sig = "  lines: { accountId: string; debit?: number; credit?: number; description?: string; payeeId?: string | null; clientId?: string | null; costCenterId?: string | null }[];\n}) {"
old_map = "          credit: l.credit ?? 0,\n          description: l.description,\n        })),"
new_map = "          credit: l.credit ?? 0,\n          description: l.description,\n          payeeId: l.payeeId ?? undefined,\n          clientId: l.clientId ?? undefined,\n          costCenterId: l.costCenterId ?? undefined,\n        })),"
if new_sig in s and new_map in s:
    print("already patched"); sys.exit(0)
if old_sig not in s or old_map not in s:
    print("ERROR: expected code not found in accounting.ts — send the file to Claude"); sys.exit(1)
s = s.replace(old_sig, new_sig, 1).replace(old_map, new_map, 1)
open(p, "w", encoding="utf-8").write(s)
print("patched accounting.ts OK")
