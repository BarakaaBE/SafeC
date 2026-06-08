import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name:             z.string().min(2),
  email:            z.string().email(),
  password:         z.string().min(8),
  organizationName: z.string().min(2),
})

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Données invalides" }, { status: 400 })

    const { name, email, password, organizationName } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)

    const baseSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50)
    let slug = baseSlug, attempt = 0
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++attempt}`
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
        select: { id: true, name: true, email: true },
      })
      const org = await tx.organization.create({
        data: {
          name: organizationName, slug,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      })
      return { user, org }
    })

    return NextResponse.json({ success: true, userId: result.user.id }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
