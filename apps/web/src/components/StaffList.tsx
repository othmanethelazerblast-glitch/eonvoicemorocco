"use client";

import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietaire",
  admin: "Administrateur",
  accountant: "Comptable",
  bookkeeper: "Assistant comptable",
  viewer: "Lecture seule",
};

const ASSIGNABLE_ROLES = ["admin", "accountant", "bookkeeper", "viewer"] as const;

/**
 * Owner/admin-only staff panel. Renders nothing for other roles instead of
 * a 403 flash — membership.list itself enforces the same gate server-side,
 * this is just the friendlier client-side mirror of it.
 */
export function StaffList() {
  const utils = trpc.useUtils();
  const membership = trpc.membership.list.useQuery(undefined, { retry: false });

  const setRole = trpc.membership.setRole.useMutation({
    onSuccess: () => utils.membership.list.invalidate(),
  });
  const setCompanyAccess = trpc.membership.setCompanyAccess.useMutation({
    onSuccess: () => utils.membership.list.invalidate(),
  });

  if (membership.isError || membership.isLoading || !membership.data) {
    return null;
  }

  const { members, companies } = membership.data;

  return (
    <Card>
      <CardHeader title="Equipe" icon={<Users className="h-4 w-4 text-slate-400" />} />
      <div className="flex flex-col gap-3">
        {members.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun membre pour le moment.</p>
        )}
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {members.map((member) => (
            <li key={member.clerkUserId} className="flex flex-col gap-2 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900 dark:text-slate-100">{member.email}</span>
                {member.role === "owner" ? (
                  <Badge tone="blue">{ROLE_LABELS.owner}</Badge>
                ) : member.userId ? (
                  <Select
                    value={member.role ?? "viewer"}
                    disabled={setRole.isPending}
                    onChange={(e) =>
                      setRole.mutate({ userId: member.userId!, role: e.target.value as (typeof ASSIGNABLE_ROLES)[number] })
                    }
                    className="w-auto"
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone="slate">En attente de premiere connexion</Badge>
                )}
              </div>

              {member.role && member.role !== "owner" && member.role !== "admin" && member.userId && (
                <div className="flex flex-wrap gap-3 pl-1 text-xs text-slate-500 dark:text-slate-400">
                  {companies.map((company) => {
                    const hasAccess = member.companyIds.includes(company.id);
                    return (
                      <label key={company.id} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={hasAccess}
                          disabled={setCompanyAccess.isPending}
                          onChange={(e) =>
                            setCompanyAccess.mutate({
                              userId: member.userId!,
                              companyId: company.id,
                              grant: e.target.checked,
                            })
                          }
                        />
                        {company.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
