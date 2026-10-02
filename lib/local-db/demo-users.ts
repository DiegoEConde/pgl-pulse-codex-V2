import { demoUsers } from "../demo-users";
import { createLocalDbClient, type LocalDbClientOptions } from "./client";

export async function ensureDemoUsers(options: LocalDbClientOptions = {}) {
  const db = createLocalDbClient(options);
  const now = new Date().toISOString();

  for (const user of demoUsers) {
    const row = {
      auth_user_id: null,
      nombre: user.nombre,
      email: user.email,
      telefono: null,
      rol: user.rol,
      activo: true,
      porcentaje_comision: user.porcentaje_comision,
      costo_envio_usd: user.costo_envio_usd,
      costo_envio_ars: user.costo_envio_ars,
      actualizado_en: now,
    };
    const existing = await db.getRowById("usuarios", user.id);

    if (existing) {
      await db.updateRow("usuarios", user.id, row);
    } else {
      await db.insertRow("usuarios", {
        id: user.id,
        ...row,
        creado_en: now,
      });
    }
  }

  return db.listRows("usuarios");
}
