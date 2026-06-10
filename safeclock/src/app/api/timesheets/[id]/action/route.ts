import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuth, isManager, err } from "@/lib/api"

const schema = z.object({
  action: z.enum(["submit", "unsubmit", "approve", "reject"]),
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

  if (action === "submit") {
    if (sheet.userId !== auth.userId) return err("Accès refusé", 403)
    if (sheet.status !== "DRAFT" && sheet.status !== "REJECTED") return err("Impossible de soumettre")
    const totalHours = sheet.entries.reduce((s, e) => s + Number(e.hours), 0)
    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: { status: "SUBMITTED", submittedAt: new Date(), totalHours },
    })
    return NextResponse.json({ status: updated.status, totalHours: Number(updated.totalHours) })
  }

  if (action === "unsubmit") {
    if (sheet.userId !== auth.userId) return err("Accès refusé", 403)
    if (sheet.status !== "SUBMITTED") return err("Seules les feuilles soumises peuvent être annulées")
    const updated = await prisma.timesheet.update({
      where: { id: params.id },
      data: { status: "DRAFT", submittedAt: null },
    })
    return NextResponse.json({ status: updated.status })
  }

  if (!isManager(auth.role)) return err("Accès refusé", 403)
  if (sheet.status !== "SUBMITTED") return err("Impossible d'agir sur cette feuille")

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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const sheet = await prisma.timesheet.findUnique({ where: { id: params.id } })
  if (!sheet) return err("Feuille introuvable", 404)
  if (sheet.userId !== auth.userId) return err("Accès refusé", 403)
  if (sheet.status !== "DRAFT") return err("Seules les feuilles brouillon peuvent être supprimées")

  await prisma.timeEntry.updateMany({ where: { timesheetId: params.id }, data: { timesheetId: null } })
  await prisma.timesheet.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}