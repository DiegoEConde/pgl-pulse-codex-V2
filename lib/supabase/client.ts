export function getSupabase() {
  return {
    async rpc(_name: string) {
      void _name;
      return {
        data: null,
        error: new Error("Supabase no esta conectado en el mockup v2."),
      };
    },
  };
}
