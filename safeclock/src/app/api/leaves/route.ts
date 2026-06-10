// src/app/api/leaves/route.ts
// GET  /api/leaves?month=2025-06    → congés du mois (employé = les siens, manager = tous)
// POST /api/leaves                  → soumet une demande de congé
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuth, isManager, err } from "@/lib/api"

const createSchema = z.object({
  type:     z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days:     z.number().int().min(1),
  note:     z.string().optional(),
})

export async function GET(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")  // "2025-06"

  const where: any = { organizationId: auth.orgId }

  // Employé ne voit que les siennes
  if (!isManager(auth.role)) where.userId = auth.userId

  if (month) {
    where.fromDate = { startsWith: month.slice(0, 7) }
  }

  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(leaves)
}

export async function POST(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err("Données invalides")

  const leave = await prisma.leaveRequest.create({
    data: {
      organizationId: auth.orgId,
      userId:         auth.userId,
      status:         "PENDING",
      ...parsed.data,
    },
  })

  return NextResponse.json(leave, { status: 201 })
}