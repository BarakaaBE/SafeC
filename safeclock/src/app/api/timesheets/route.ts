// src/app/api/timesheets/route.ts
// GET  /api/timesheets?month=2025-06            → feuille du mois (crée si inexistante)
// GET  /api/timesheets?month=2025-06&all=true   → toutes les feuilles du mois (manager)
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuth, isManager, err } from "@/lib/api"

export async function GET(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")   // "2025-06"
  const all   = searchParams.get("all") === "true"

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return err("Paramètre ?month=YYYY-MM requis")
  }

  // Manager peut voir toutes les feuilles du mois
  if (all && isManager(auth.role)) {
    const sheets = await prisma.timesheet.findMany({
      where: { organizationId: auth.orgId, monthKey: month },
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: { select: { hours: true, date: true, project: { select: { name: true, color: true } } } },
      },
      orderBy: { user: { name: "asc" } },
    })
    return NextResponse.json(sheets.map(normalizeSheet))
  }

  // Employé : récupère (ou crée) sa propre feuille
  const sheet = await prisma.timesheet.upsert({
    where: { organizationId_userId_monthKey: { organizationId: auth.orgId, userId: auth.userId, monthKey: month } },
    create: { organizationId: auth.orgId, userId: auth.userId, monthKey: month, status: "DRAFT" },
    update: {},
    include: {
      user: { select: { id: true, name: true, email: true } },
      entries: {
        include: { project: { select: { id: true, name: true, color: true, client: true } } },
        orderBy: { date: "asc" },
      },
    },
  })

  return NextResponse.json(normalizeSheet(sheet))
}

function normalizeSheet(s: any) {
  return {
    id:          s.id,
    monthKey:    s.monthKey,
    status:      s.status,
    totalHours:  Number(s.totalHours),
    submittedAt: s.submittedAt,
    approvedAt:  s.approvedAt,
    user:        s.user,
    entries:     (s.entries ?? []).map((e: any) => ({
      id:          e.id,
      date:        e.date,
      hours:       Number(e.hours),
      description: e.description,
      project:     e.project,
    })),
  }
}