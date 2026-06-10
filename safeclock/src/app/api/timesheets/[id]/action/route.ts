// src/app/api/timesheets/[id]/action/route.ts
// POST /api/timesheets/[id]/action
// Body: { action: "submit" | "approve" | "reject", reason?: string }
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuth, isManager, err } from "@/lib/api"

const schema = z.object({
  action: z.enum(["submit", "approve", "reject"]),
  reason: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err("Action invalide")

  const { action, reason } = parsed.data

  const sheet = await prisma.timesheet.findUnique({
    where: { id: params.id },
    include: { entries: { select: { hours: true } } },
  })
  if (!sheet) return err("Feuille introuvable", 404)
  if (sheet.organizationId !== auth.orgId) return err("Accès refusé", 403)

  // submit : employé soumet sa propre feuille
  if (action === "submit") {
    if (sheet.userId !== auth.userId) return err("Accès refusé", 403)
    if (sheet.status !== "DRAFT" && sheet.status !== "REJECTED") {
      return err(`Statut actuel ${sheet.status}, impossible de soumettre`)
    }
    const totalHours = sheet.entries.reduce((s, e) => s + Number(e.hours), 0)
    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: { status: "SUBMITTED", submittedAt: new Date(), totalHours },
    })
    return NextResponse.json({ status: updated.status, totalHours: Number(updated.totalHours) })
  }

  // approve / reject : managers uniquement
  if (!isManager(auth.role)) return err("Accès refusé", 403)
  if (sheet.status !== "SUBMITTED") return err(`Statut actuel ${sheet.status}, impossible d'agir`)

  if (action === "approve") {
    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: auth.userId },
    })
    return NextResponse.json({ status: updated.status })
  }

  if (action === "reject") {
    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: { status: "REJECTED", rejectedReason: reason ?? null },
    })
    return NextResponse.json({ status: updated.status })
  }
}