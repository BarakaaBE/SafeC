// src/app/api/time-entries/[id]/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuth, err } from "@/lib/api"
 
const updateSchema = z.object({
  description: z.string().optional(),
  hours:       z.number().min(0.25).max(24).optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  projectId:   z.string().nullable().optional(),
})
 
// PATCH /api/time-entries/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth
 
  const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } })
  if (!entry) return err("Entrée introuvable", 404)
  if (entry.userId !== auth.userId) return err("Accès refusé", 403)
  if (entry.timesheetId) return err("Entrée soumise, non modifiable", 409)
 
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return err("Données invalides")
 
  const updated = await prisma.timeEntry.update({
    where: { id: params.id },
    data: parsed.data,
    include: {
      project: { select: { id: true, name: true, client: true, color: true } },
    },
  })
 
  return NextResponse.json({ ...updated, hours: Number(updated.hours) })
}
 
// DELETE /api/time-entries/[id]
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth
 
  const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } })
  if (!entry) return err("Entrée introuvable", 404)
  if (entry.userId !== auth.userId) return err("Accès refusé", 403)
  if (entry.timesheetId) return err("Entrée soumise, non supprimable", 409)
 
  await prisma.timeEntry.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
 