export async function POST() {
  return Response.json(
    { error: "El acceso con contraseña fue reemplazado por Google institucional UBB." },
    { status: 410 },
  );
}
