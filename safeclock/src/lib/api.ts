// src/lib/api.ts  ← NOUVEAU fichier
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"

export type AuthSession = {
  userId: string
  orgId: string
  role: string
}

/** Vérifie la session JWT. Renvoie les données auth ou une Response 401. */
export async function getAuth(): Promise<AuthSession | NextResponse> {
  const session = await getServerSession(authOptions)
  const u = session?.user
  if (!u?.id || !u?.organizationId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }
  return { userId: u.id, orgId: u.organizationId, role: u.role }
}

export function isManager(role: string) {
  return ["OWNER", "ADMIN", "MANAGER"].includes(role)
}

export function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}