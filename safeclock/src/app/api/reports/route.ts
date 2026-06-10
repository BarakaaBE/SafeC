// src/app/api/reports/route.ts
// GET /api/reports?month=2025-06  → rapport mensuel (managers uniquement)
// Retourne : heures par projet, heures par membre avec coût
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuth, isManager, err } from "@/lib/api"

export async function GET(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth
  if (!isManager(auth.role)) return err("Accès refusé", 403)

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return err("Paramètre ?month=YYYY-MM requis")
  }

  // Toutes les entrées du mois pour l'organisation
  const entries = await prisma.timeEntry.findMany({
    where: {
      user: { memberships: { some: { organizationId: auth.orgId, isActive: true } } },
      date: { startsWith: month },
    },
    include: {
      project: { select: { id: true, name: true, client: true, color: true, billRate: true } },
      user: {
        select: {
          id: true, name: true,
          memberships: {
            where: { organizationId: auth.orgId },
            select: { hourlyRate: true },
            take: 1,
          },
        },
      },
    },
  })

  // ── Par projet ────────────────────────────────────────────
  const byProject = new Map<string, { id: string; name: string; client: string | null; color: string | null; billRate: number | null; hours: number; revenue: number }>()

  for (const e of entries) {
    const key = e.projectId ?? "__no_project__"
    const proj = e.project
    const existing = byProject.get(key) ?? {
      id:       proj?.id ?? "__no_project__",
      name:     proj?.name ?? "Sans projet",
      client:   proj?.client ?? null,
      color:    proj?.color ?? null,
      billRate: proj?.billRate ? Number(proj.billRate) : null,
      hours:    0,
      revenue:  0,
    }
    const h = Number(e.hours)
    existing.hours   += h
    existing.revenue += proj?.billRate ? h * Number(proj.billRate) : 0
    byProject.set(key, existing)
  }

  // ── Par membre ────────────────────────────────────────────
  const byMember = new Map<string, { id: string; name: string | null; hourlyRate: number | null; hours: number; cost: number }>()

  for (const e of entries) {
    const existing = byMember.get(e.userId) ?? {
      id:         e.user.id,
      name:       e.user.name,
      hourlyRate: e.user.memberships[0]?.hourlyRate ? Number(e.user.memberships[0].hourlyRate) : null,
      hours:      0,
      cost:       0,
    }
    const h = Number(e.hours)
    const rate = existing.hourlyRate ?? 0
    existing.hours += h
    existing.cost  += h * rate
    byMember.set(e.userId, existing)
  }

  return NextResponse.json({
    month,
    totalHours:   entries.reduce((s, e) => s + Number(e.hours), 0),
    totalRevenue: [...byProject.values()].reduce((s, p) => s + p.revenue, 0),
    byProject:    [...byProject.values()].sort((a, b) => b.hours - a.hours),
    byMember:     [...byMember.values()].sort((a, b) => b.hours - a.hours),
  })
}