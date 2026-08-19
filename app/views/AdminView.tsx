"use client";

import { CaretLeft, CaretRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { loadAdminUsers, roleLabel } from "../../lib/portal-utils";
import type { User } from "../../lib/portal-utils";

// Implements: REQ-PERF-05
export function AdminView() {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchAccounts = useCallback(async (targetPage: number, query: string) => {
    setLoading(true);
    try {
      const result = await loadAdminUsers(targetPage, 50, query);
      setAccounts(result.users);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch {
      setAccounts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      loadAdminUsers(page, 50, searchQuery)
        .then((result) => {
          if (active) {
            setAccounts(result.users);
            setTotal(result.total);
            setPage(result.page);
            setTotalPages(result.totalPages);
          }
        })
        .catch(() => {
          if (active) {
            setAccounts([]);
            setTotal(0);
            setTotalPages(1);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, searchQuery]);

  const changeRole = async (userId: string, role: "teacher" | "student") => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (response.ok) {
        // Dual-store sync: ensure Firestore projection is updated concurrently by the owner
        let syncSuccess = true;
        try {
          const { updateRemoteUserRole } = await import("../../lib/firebase/profile");
          await updateRemoteUserRole(userId, role);
        } catch (err) {
          console.error("[AdminView] Error sincronizando proyección de Firestore:", err);
          syncSuccess = false;
        }
        setMessage(
          syncSuccess
            ? "Rol actualizado exitosamente en Turso y Firestore."
            : "Rol actualizado en Turso, pero ocurrió una advertencia al sincronizar con Firestore."
        );
        await fetchAccounts(page, searchQuery);
      } else {
        setMessage("No fue posible actualizar el rol.");
      }
    } catch {
      setMessage("No fue posible actualizar el rol.");
    }
  };

  return (
    <section>
      <div className="page-head lead">
        <h1>Administración de cuentas</h1>
        {/* Implements: REQ-DELIB-02 */}
        <p>
          <span>
            <b className="num">{total}</b> {total === 1 ? "cuenta registrada" : "cuentas registradas"}
            {searchQuery.trim() ? " (filtradas)" : ""}
          </span>
          <span>·</span>
          <span>el rango se asigna por dominio institucional</span>
        </p>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search-box">
          <MagnifyingGlass size={18} className="admin-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="admin-search-input"
            placeholder="Buscar por nombre o correo…"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            aria-label="Buscar cuentas"
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-search-clear"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
              }}
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="admin-table">
        <div className="admin-head">
          <span>Cuenta</span>
          <span>Rango</span>
          <span>Acción</span>
        </div>
        {accounts.length === 0 && !loading && (
          <p className="empty-row">
            {searchQuery.trim()
              ? `No se encontraron cuentas para "${searchQuery}".`
              : "Todavía no hay cuentas institucionales registradas."}
          </p>
        )}
        {accounts.map((account) => (
          <div className="admin-row" key={account.id}>
            <span>
              <b>{account.name}</b>
              <small>{account.email}</small>
            </span>
            <span className={`role-chip ${account.role}`}>{roleLabel(account.role)}</span>
            <span>
              {account.role !== "owner" && (
                <select
                  aria-label={`Cambiar rango de ${account.name}`}
                  value={account.role}
                  onChange={(event) =>
                    changeRole(account.id, event.target.value as "teacher" | "student")
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

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            aria-label="Página anterior"
          >
            <CaretLeft size={16} />
            <span>Anterior</span>
          </button>
          <span className="admin-page-info">
            Página <b className="num">{page}</b> de <b className="num">{totalPages}</b>
          </span>
          <button
            type="button"
            className="admin-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            aria-label="Página siguiente"
          >
            <span>Siguiente</span>
            <CaretRight size={16} />
          </button>
        </div>
      )}

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
