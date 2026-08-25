import { prisma } from "@/lib/prisma";
import { LeadSource, LeadStatus } from "@prisma/client";
import type { Lead } from "@/lib/types";

export function leadFromRow(row: {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  source: string;
  status: string;
  score: number;
  owner?: { firstName: string; lastName: string } | null;
  createdAt: Date;
  revenue: unknown;
}): Lead {
  return {
    id: row.id,
    name: `${row.firstName} ${row.lastName}`,
    company: row.company || "—",
    source: row.source.replaceAll("_", " "),
    status: row.status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) as Lead["status"],
    score: row.score,
    owner: row.owner ? `${row.owner.firstName} ${row.owner.lastName}` : "Unassigned",
    created: row.createdAt.toISOString(),
    revenue: Number(row.revenue || 0)
  };
}

export async function listLeadsByWorkspace(workspaceId: string, query = "") {
  const rows = await prisma.lead.findMany({
    where: {
      workspaceId,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { company: { contains: query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { owner: true },
    orderBy: { createdAt: "desc" }
  });
  return rows.map(leadFromRow);
}

export async function getLeadById(workspaceId: string, id: string) {
  const row = await prisma.lead.findFirst({
    where: { id, workspaceId },
    include: {
      owner: true,
      activities: { orderBy: { createdAt: "desc" }, take: 25 },
      notes: { orderBy: { createdAt: "desc" }, take: 25 },
      opportunities: true
    }
  });
  return row ? { lead: leadFromRow(row), detail: row } : null;
}

export async function createLead(input: {
  workspaceId: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  source?: string;
}) {
  return prisma.lead.create({
    data: {
      workspaceId: input.workspaceId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      company: input.company,
      source: (input.source?.toUpperCase().replaceAll(" ", "_") as LeadSource) || LeadSource.MANUAL,
      status: LeadStatus.NEW
    }
  });
}
