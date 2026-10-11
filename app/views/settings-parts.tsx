import { roleLabel, type User } from "../../lib/portal-utils";

export function AccountFacts({ user }: { user: User }) {
  return (
    <dl className="settings-facts">
      <div>
        <dt>Correo institucional</dt>
        <dd>{user.email}</dd>
      </div>
      <div>
        <dt>Rango</dt>
        <dd>{roleLabel(user.role)}</dd>
      </div>
      {user.carrera ? (
        <div>
          <dt>Carrera</dt>
          <dd>{user.carrera}</dd>
        </div>
      ) : null}
    </dl>
  );
}
