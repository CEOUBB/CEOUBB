export default function DeleteAccountPage() {
  const subject = encodeURIComponent("Solicitud de eliminación de cuenta · Centro de Estudio UBB");
  const body = encodeURIComponent("Solicito eliminar mi cuenta de Centro de Estudio UBB y sus datos asociados.\n\nCorreo institucional de la cuenta:\nNombre:\n");
  return (
    <main className="policy-page">
      <a className="policy-brand" href="/">CE · Centro de Estudio UBB</a>
      <article>
        <span className="eyebrow">Control de tus datos</span>
        <h1>Eliminar una cuenta</h1>
        <p>Puedes iniciar la eliminación directamente desde la aplicación en la opción <strong>Eliminar cuenta</strong>. También puedes solicitarla desde cualquier dispositivo mediante el botón inferior.</p>
        <h2>Qué se eliminará</h2>
        <p>El perfil de Centro de Estudio UBB, el progreso sincronizado, las publicaciones creadas por la cuenta y los archivos asociados. Esto no elimina ni modifica tu cuenta institucional de Google o de la Universidad del Bío-Bío.</p>
        <h2>Verificación</h2>
        <p>Envía la solicitud desde el mismo correo institucional asociado a la cuenta. Confirmaremos la identidad y procesaremos la eliminación dentro de un plazo máximo de siete días.</p>
        <a className="policy-action" href={`mailto:elpapijuaco325@gmail.com?subject=${subject}&body=${body}`}>Solicitar eliminación por correo</a>
        <nav><a href="/privacidad">Leer política de privacidad</a><a href="/">Volver al portal</a></nav>
      </article>
    </main>
  );
}
