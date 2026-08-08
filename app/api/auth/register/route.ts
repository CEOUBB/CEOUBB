export async function POST() {
  return Response.json(
    { error: "Las cuentas ahora se crean únicamente mediante Google institucional UBB." },
    { status: 410 },
  );
}
