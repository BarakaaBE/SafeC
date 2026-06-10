// src/app/api/time-entries/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuth, err } from "@/lib/api"

const createSchema = z.object({
  projectId:   z.string().optional().nullable(),
  description: z.string().optional(),
  hours:       z.number().min(0.25).max(24),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // "2025-06-09"
  source:      z.enum(["timer", "manual"]).default("manual"),
})

// GET /api/time-entries?date=2025-06-09
//                      &month=2025-06     (toutes les entrées du mois)
//                      &userId=xxx        (manager uniquement)
export async function GET(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date  = searchParams.get("date")
  const month = searchParams.get("month")   // format "2025-06"
  const targetUserId = searchParams.get("userId") ?? auth.userId

  // Un employé ne peut voir que ses propres entrées
  const userId = auth.role === "EMPLOYEE" ? auth.userId : targetUserId

  const where: any = { userId }

  if (date) {
    where.date = date
  } else if (month) {
    // "2025-06" → toutes les dates qui commencent par "2025-06"
    where.date = { startsWith: month }
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, client: true, color: true, billRate: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(entries.map((e) => ({
    id:          e.id,
    description: e.description,
    hours:       Number(e.hours),
    date:        e.date,
    source:      e.source,
    startTime:   e.startTime,
    project:     e.project,
    timesheetId: e.timesheetId,
  })))
}

// POST /api/time-entries — crée une entrée de temps
export async function POST(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err("Données invalides")

  // Vérifie que le projet appartient à l'organisation
  if (parsed.data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, organizationId: auth.orgId },
    })
    if (!project) return err("Projet introuvable", 404)
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId:      auth.userId,
      ...parsed.data,
    },
    include: {
      project: { select: { id: true, name: true, client: true, color: true, billRate: true } },
    },
  })

  return NextResponse.json({
    id:          entry.id,
    description: entry.description,
    hours:       Number(entry.hours),
    date:        entry.date,
    source:      entry.source,
    project:     entry.project,
  }, { status: 201 })
}