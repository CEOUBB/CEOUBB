"use client";

import { useCallback, useEffect, useState } from "react";
import { loadAdminUsers, roleLabel } from "../../lib/portal-utils";
import type { User } from "../../lib/portal-utils";

export function AdminView() {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [message, setMessage] = useState("");

  const refreshAccounts = useCallback(async () => {
    const list = await loadAdminUsers();
    setAccounts(list);
  }, []);

  useEffect(() => {
    let active = true;
    loadAdminUsers()
      .then((users) => {
        if (active) setAccounts(users);
      })
      .catch(() => {
        if (active) setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const changeRole = async (userId: string, role: "teacher" | "student") => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      setMessage(
        response.ok ? "Rol actualizado." : "No fue posible actualizar el rol.",
      );
      if (response.ok) {
        await refreshAccounts();
      }
    } catch {
      setMessage("No fue posible actualizar el rol.");
    }
  };

  return (
    <section>
      <div className="page-head lead">
        <h1>Administración de cuentas</h1>
        <p>
          <span>
            <b>{accounts.length}</b>{" "}
            {accounts.length === 1
              ? "cuenta registrada"
              : "cuentas registradas"}
          </span>
          <span>·</span>
          <span>el rango se asigna por dominio institucional</span>
        </p>
      </div>
      <div className="admin-table">
        <div className="admin-head">
          <span>Cuenta</span>
          <span>Rango</span>
          <span>Acción</span>
        </div>
        {accounts.length === 0 && (
          <p className="empty-row">
            Todavía no hay cuentas institucionales registradas.
          </p>
        )}
        {accounts.map((account) => (
          <div className="admin-row" key={account.id}>
            <span>
              <b>{account.name}</b>
              <small>{account.email}</small>
            </span>
            <span className={`role-chip ${account.role}`}>
              {roleLabel(account.role)}
            </span>
            <span>
              {account.role !== "owner" && (
                <select
                  aria-label={`Cambiar rango de ${account.name}`}
                  value={account.role}
                  onChange={(event) =>
                    changeRole(
                      account.id,
                      event.target.value as "teacher" | "student",
                    )
                  }
                >
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor UBB</option>
                </select>
              )}
            </span>
          </div>
        ))}
      </div>
      {message && (
        <p
          className={`tool-status ${message.startsWith("Rol actualizado") ? "ok" : "bad"}`}
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  );
}
