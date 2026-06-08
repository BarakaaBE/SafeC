import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Démarrage du seed...")

  await prisma.timeEntry.deleteMany()
  await prisma.timesheet.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  const hash = await bcrypt.hash("Admin123", 12)

  const alice = await prisma.user.create({
    data: { name: "Alice Martin", email: "alice@safeclock.be", passwordHash: hash }
  })
  const bob = await prisma.user.create({
    data: { name: "Bob Dupont", email: "bob@safeclock.be", passwordHash: await bcrypt.hash("Bob123", 12) }
  })
  const emma = await prisma.user.create({
    data: { name: "Emma Bernard", email: "emma@safeclock.be", passwordHash: await bcrypt.hash("Emma123", 12) }
  })

  const org = await prisma.organization.create({
    data: {
      name: "Mon Entreprise",
      slug: "mon-entreprise",
      members: {
        create: [
          { userId: alice.id, role: "OWNER",    hourlyRate: 0,  jobTitle: "Administratrice" },
          { userId: bob.id,   role: "EMPLOYEE", hourlyRate: 75, jobTitle: "Chef de projet"  },
          { userId: emma.id,  role: "EMPLOYEE", hourlyRate: 65, jobTitle: "Développeuse"    },
        ]
      }
    }
  })

  await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "Refonte Site Web",
      client: "Acme Corp",
      status: "ACTIVE",
      billRate: 120,
      budgetHours: 180,
      color: "#F4511E",
      members: { create: [{ userId: bob.id }, { userId: emma.id }] }
    }
  })

  console.log("✅ Seed terminé !")
  console.log("\n📧 Comptes de test :")
  console.log("  alice@safeclock.be / Admin123  (Owner)")
  console.log("  bob@safeclock.be   / Bob123    (Employé)")
  console.log("  emma@safeclock.be  / Emma123   (Employée)")
}

main().catch(console.error).finally(() => prisma.$disconnect())
