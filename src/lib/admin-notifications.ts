import { count, eq } from "drizzle-orm";

import { users } from "@/db/schema";
import { db } from "@/lib/db";
import { newUserAdminEmailHtml, sendEmail } from "@/lib/email";

/**
 * Avisa por e-mail todo admin (users.role = "admin") que uma conta nova foi
 * criada. Chamado dentro de `after()` pelos dois fins de cadastro
 * (signupAction e o onboarding do Google), então nunca atrasa nem derruba o
 * cadastro em si — uma falha aqui só fica no log. Não lança: como roda
 * depois da resposta, não há ninguém acima pra tratar o erro.
 */
export async function notifyAdminsOfSignup(userId: string, method: "credentials" | "google"): Promise<void> {
  try {
    const [[newUser], admins, [{ totalUsers }]] = await Promise.all([
      db
        .select({ username: users.username, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userId)),
      db.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, "admin")),
      db.select({ totalUsers: count() }).from(users),
    ]);

    if (!newUser?.username || admins.length === 0) return;

    const htmlContent = newUserAdminEmailHtml({
      displayName: newUser.name ?? newUser.username,
      username: newUser.username,
      email: newUser.email,
      method,
      totalUsers,
      profileUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/users/${userId}`,
    });

    const results = await Promise.allSettled(
      admins.map((admin) => sendEmail({ to: admin.email, subject: "Novo cadastro no ShowRadar", htmlContent })),
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        // Só ids no log — nunca o e-mail do admin nem o do usuário novo.
        console.error("Failed to send new-signup email", { adminId: admins[index].id, newUserId: userId }, result.reason);
      }
    });
  } catch (error) {
    console.error("Failed to notify admins of new signup", { newUserId: userId }, error);
  }
}
