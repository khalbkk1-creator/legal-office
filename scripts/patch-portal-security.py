import re, sys, glob

# يستبدل البحث المباشر بالتوكن بالدالة الآمنة (تتحقق من الصلاحية والتعطيل وتسجّل الوصول)
files = glob.glob("src/app/api/portal/[[]token[]]/**/route.ts", recursive=True) + ["src/app/portal/[token]/page.tsx", "src/app/portal/[token]/profile/page.tsx"]
pattern = re.compile(r"await\s+prisma\.client\.findUnique\(\s*\{\s*where:\s*\{\s*accessToken:\s*params\.token\s*\}\s*\}\s*\)")
changed = 0
for f in files:
    try:
        s = open(f, encoding="utf-8").read()
    except FileNotFoundError:
        continue
    if "resolvePortalClientByToken" in s:
        continue
    n, count = pattern.subn("await resolvePortalClientByToken(params.token)", s)
    if count == 0:
        continue
    if 'from "@/lib/portalAuth"' not in n:
        n = n.replace('import { prisma } from "@/lib/prisma";', 'import { prisma } from "@/lib/prisma";\nimport { resolvePortalClientByToken } from "@/lib/portalAuth";', 1)
        if "resolvePortalClientByToken } from" not in n:
            n = 'import { resolvePortalClientByToken } from "@/lib/portalAuth";\n' + n
    open(f, "w", encoding="utf-8").write(n)
    changed += 1
    print("patched", f, f"({count})")

print(f"done — {changed} files")
if changed == 0:
    print("WARNING: no files changed (maybe already patched)")
