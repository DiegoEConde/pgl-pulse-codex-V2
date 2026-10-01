export async function runOperation(_name: string, _payload?: Record<string, unknown>): Promise<never> {
  void _name;
  void _payload;
  throw new Error("Las operaciones reales estan deshabilitadas en el mockup v2.");
}

export function operationError(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operacion.";
}
