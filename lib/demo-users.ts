import type { RolUsuario, UUID } from "./local-db/schema";

export type DemoUser = {
  id: UUID;
  username: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  password: string;
  porcentaje_comision: number;
  costo_envio_usd: number;
  costo_envio_ars: number;
};

export const DEMO_USER_PASSWORD = "12345";

export const demoUsers: DemoUser[] = [
  {
    id: "90000000-0000-4000-8000-000000000001",
    username: "ariel",
    nombre: "Ariel",
    email: "ariel@pgl.local",
    rol: "ADMINISTRADOR",
    password: DEMO_USER_PASSWORD,
    porcentaje_comision: 0,
    costo_envio_usd: 0,
    costo_envio_ars: 0,
  },
  {
    id: "90000000-0000-4000-8000-000000000002",
    username: "lucas",
    nombre: "Lucas",
    email: "lucas@pgl.local",
    rol: "VENDEDOR",
    password: DEMO_USER_PASSWORD,
    porcentaje_comision: 5,
    costo_envio_usd: 0,
    costo_envio_ars: 0,
  },
  {
    id: "90000000-0000-4000-8000-000000000003",
    username: "lucho",
    nombre: "Lucho",
    email: "lucho@pgl.local",
    rol: "REPARTIDOR",
    password: DEMO_USER_PASSWORD,
    porcentaje_comision: 0,
    costo_envio_usd: 3,
    costo_envio_ars: 0,
  },
];

export function roleDisplayName(role: RolUsuario) {
  if (role === "ADMINISTRADOR") return "Administrador";
  if (role === "REPARTIDOR") return "Repartidor";
  return "Vendedor";
}
