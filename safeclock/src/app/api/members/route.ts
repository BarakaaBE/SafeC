// src/app/api/members/route.ts
// GET  /api/members               → liste membres de l'organisation
// POST /api/members               → invite un nouveau membre (manager+)
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuth, isManager, err } from "@/lib/api"

const inviteSchema = z.object({
  name:       z.string().min(2),
  email:      z.string().email(),
  role:       z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  jobTitle:   z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
})

export async function GET() {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: auth.orgId, isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
    orderBy: { joinedAt: "asc" },
  })

  return NextResponse.json(members.map((m) => ({
    id:         m.id,
    userId:     m.userId,
    name:       m.user.name,
    email:      m.user.email,
    role:       m.role,
    jobTitle:   m.jobTitle,
    hourlyRate: m.hourlyRate ? Number(m.hourlyRate) : null,
    joinedAt:   m.joinedAt,
  })))
}

export async function POST(req: Request) {
  const auth = await getAuth()
  if (auth instanceof NextResponse) return auth
  if (!isManager(auth.role)) return err("Accès refusé", 403)

  const body = await req.json()
  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) return err("Données invalides")

  const { name, email, role, jobTitle, hourlyRate } = parsed.data

  // Vérifie si l'utilisateur existe déjà
  let user = await prisma.user.findUnique({ where: { email } })

  // Sinon crée un compte sans mot de passe (invitation pending)
  if (!user) {
    user = await prisma.user.create({
      data: { name, email },
    })
  }

  // Vérifie s'il est déjà membre
  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: auth.orgId, userId: user.id } },
  })
  if (existing) return err("Cet utilisateur est déjà membre", 409)

  const member = await prisma.organizationMember.create({
    data: {
      organizationId: auth.orgId,
      userId:         user.id,
      role,
      jobTitle,
      hourlyRate,
    },
  })

  return NextResponse.json({
    id:       member.id,
    userId:   user.id,
    name:     user.name,
    email:    user.email,
    role:     member.role,
    jobTitle: member.jobTitle,
  }, { status: 201 })
}