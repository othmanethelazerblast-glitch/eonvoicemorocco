import { TRPCError } from "@trpc/server";
import { Prisma } from "@app/db";

/** Prisma's FK-violation code for a delete blocked by `onDelete: Restrict`
 * (e.g. deleting a Client or Company that still has invoices). Centralized
 * so every delete mutation surfaces the same friendly message instead of a
 * raw "Foreign key constraint failed on the field...". */
export async function deleteOrFriendlyConflict<T>(run: () => Promise<T>, conflictMessage: string): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new TRPCError({ code: "CONFLICT", message: conflictMessage });
    }
    throw err;
  }
}
