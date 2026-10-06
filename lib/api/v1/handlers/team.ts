/** /api/v1/team handlers (moved from the catch-all route; see lib/api/v1/core.ts for shared checks). */
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth-server";
import { cacheGetOrSet } from "@/lib/cache";
import { listPersistedTeam } from "@/lib/repositories";
import { teamInviteInput, ok, error, context, teamActor, inviteBaseUrl, type V1Context } from "@/lib/api/v1/core";

export async function GET({ path, auth, listQuery }: V1Context): Promise<Response | null> {
  if (path === "team") return ok(await cacheGetOrSet(`ws:${auth.session.workspaceId}:v1:team`, async () => ({ items: await listPersistedTeam(auth.session.workspaceId), filters: listQuery }), 15_000));
  return null;
}

export async function POST({ request, url, path, body }: V1Context): Promise<Response | null> {
  if (path === "team") {
    const auth = await context("team.manage"); if (auth.error) return auth.error;
    const parsed = teamInviteInput.safeParse(body);
    if (!parsed.success) return error(parsed.error.issues[0]?.message || "Invalid team invitation.");
    const { inviteTeamMember } = await import("@/lib/team-service");
    const result = await inviteTeamMember(teamActor(auth.session), parsed.data, inviteBaseUrl(request, url));
    if (!result.ok) return error(result.message, result.status, result.code);
    return ok({
      item: result.data.user,
      delivered: result.data.delivered,
      message: result.data.delivered
        ? `Invitation email successfully sent to ${result.data.user.email}.`
        : `Invitation created for ${result.data.user.email}. Configure SMTP to enable automatic email delivery.`
    }, undefined, { status: 201 });
  }
  if (path.startsWith("team/") && path.endsWith("/resend")) {
    const auth = await context("team.manage"); if (auth.error) return auth.error;
    const { resendTeamInvite } = await import("@/lib/team-service");
    const result = await resendTeamInvite(teamActor(auth.session), path.split("/")[1], inviteBaseUrl(request, url));
    if (!result.ok) return error(result.message, result.status);
    return ok({
      success: true,
      delivered: result.data.delivered,
      message: result.data.delivered
        ? `Invitation re-sent to ${result.data.email}.`
        : `Invitation refreshed for ${result.data.email}. Configure SMTP to enable automatic email delivery.`
    });
  }
  return null;
}

export async function PATCH({ request, path, auth, body }: V1Context): Promise<Response | null> {
  if (path.startsWith("team/")) {
    const id = path.split("/")[1];
    const { changeTeamMember } = await import("@/lib/team-service");
    const result = await changeTeamMember(teamActor(auth.session), id, { role: body?.role, status: body?.status, jobTitle: body?.jobTitle });
    if (!result.ok) return error(result.message, result.status);

    let emailDelivered = false;
    if (result.data.roleChanged) {
      try {
        const workspace = await prisma.workspace.findUnique({ where: { id: auth.session.workspaceId } });
        if (workspace) {
          const { sendRoleUpdateEmail } = await import("@/lib/email");
          const emailResult = await sendRoleUpdateEmail({
            to: result.data.email,
            recipientName: result.data.firstName,
            updatedByName: auth.session.name || "Workspace Administrator",
            workspaceName: workspace.name,
            newRole: result.data.roleChanged,
            loginUrl: `${inviteBaseUrl(request, new URL(request.url))}/auth/login`
          });
          emailDelivered = emailResult.delivered;
        }
      } catch (err) {
        console.error("Role update notification email failed:", err);
      }
    }

    return ok({ id, updated: true, delivered: emailDelivered });
  }
  return null;
}

export async function DELETE({ auth, entity, id }: V1Context): Promise<Response | null> {
  if (entity === "team") {
    if (!can(auth.session.role, "team.manage")) return error("You do not have permission to perform this action.", 403);
    const { removeTeamMember } = await import("@/lib/team-service");
    const result = await removeTeamMember(teamActor(auth.session), id);
    if (!result.ok) return error(result.message, result.status);
    return ok({ deleted: id });
  }
  return null;
}
