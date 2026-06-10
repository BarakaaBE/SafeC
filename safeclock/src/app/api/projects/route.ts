// src/app/api/projects/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuth, isManager, err } from "@/lib/api"

const createSchema = z.object({
  name:        z.string().min(1),
  client:      z.string().optional(),
  billRate:    z.number().positive().optional(),
  budgetHours: z.number().positive().optional(),
  color:       z.string().optional(),
  status:      z.enum(["ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
})

// GET /api/projects — liste tous les projets de l'organisation
export async function GET() {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const projects = await prisma.project.findMany({
    where: { organizationId: auth.orgId },
    include: {
      members: { select: { userId: true } },
      timeEntries: { select: { hours: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data = projects.map((p) => ({
    id:          p.id,
    name:        p.name,
    client:      p.client,
    status:      p.status,
    billRate:    p.billRate ? Number(p.billRate) : null,
    budgetHours: p.budgetHours ? Number(p.budgetHours) : null,
    color:       p.color,
    usedHours:   p.timeEntries.reduce((s, e) => s + Number(e.hours), 0),
    memberCount: p.members.length,
    createdAt:   p.createdAt,
  }))

  return NextResponse.json(data)
}

// POST /api/projects — crée un projet (OWNER/ADMIN/MANAGER uniquement)
export async function POST(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth
  if (!isManager(auth.role)) return err("Accès refusé", 403)

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err("Données invalides")

  const project = await prisma.project.create({
    data: {
      organizationId: auth.orgId,
      ...parsed.data,
    },
  })

  return NextResponse.json(project, { status: 201 })
}