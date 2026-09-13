"use client";

import { Archive, CaretLeft, CaretRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "../../lib/toast";
import {
  archiveAcademicPeriod,
  loadAcademicPeriods,
  loadAdminUsers,
  roleLabel,
} from "../../lib/portal-utils";
import type { AcademicPeriodSummary, User } from "../../lib/portal-utils";

function AdminPeriodsSection({
  periods,
  periodsLoading,
  archivingPeriod,
  onArchivePeriod,
}: {
  periods: AcademicPeriodSummary[];
  periodsLoading: boolean;
  archivingPeriod: string;
  onArchivePeriod: (period: AcademicPeriodSummary) => void;
}) {
  return (
    <section className="admin-periods" aria-labelledby="admin-periods-title">
      <div>
        <h2 id="admin-periods-title">Períodos académicos</h2>
        <p>El cierre conserva todos los ramos y los mueve al historial de solo lectura.</p>
      </div>
      {periodsLoading && <p className="empty-row">Cargando períodos…</p>}
      {!periodsLoading && periods.length === 0 && (
        <p className="empty-row">Todavía no hay períodos académicos registrados.</p>
      )}
      <div className="admin-period-list">
        {periods.map((period) => (
          <article key={period.id}>
            <span>
              <strong>{period.nombre}</strong>
              <small className="num">
                {period.fechaInicio} al {period.fechaFin}
              </small>
            </span>
            <span className={`period-state ${period.estado}`}>{period.estado}</span>
            {period.estado === "archivado" ? (
              <span className="period-archived-label">
                <Archive aria-hidden="true" size={16} /> Solo lectura
              </span>
            ) : (
              <button
                aria-label={`Archivar el período ${period.nombre}`}
                className="secondary-button"
                disabled={archivingPeriod.length > 0}
                onClick={() => onArchivePeriod(period)}
                type="button"
              >
                <Archive aria-hidden="true" size={16} />
                {archivingPeriod === period.id ? "Archivando…" : "Archivar período"}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminAccountsTable({
  accounts,
  loading,
  searchQuery,
  onChangeRole,
}: {
  accounts: User[];
  loading: boolean;
  searchQuery: string;
  onChangeRole: (userId: string, role: "teacher" | "student") => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: accounts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  return (
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
      {accounts.length > 0 && (
        <div
          ref={parentRef}
          style={{
            maxHeight: "560px",
            overflowY: "auto",
            position: "relative",
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const account = accounts[virtualRow.index];
              if (!account) return null;
              return (
                <div
                  key={account.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="admin-row">
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
                            onChangeRole(account.id, event.target.value as "teacher" | "student")
                          }
                        >
                          <option value="student">Estudiante</option>
                          <option value="teacher">Profesor UBB</option>
                        </select>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPagination({
  page,
  totalPages,
  loading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <button
        type="button"
        className="admin-page-btn"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1 || loading}
        aria-label="Página anterior"
      >
        <CaretLeft aria-hidden="true" size={16} />
        <span>Anterior</span>
      </button>
      <span className="admin-page-info">
        Página <b className="num">{page}</b> de <b className="num">{totalPages}</b>
      </span>
      <button
        type="button"
        className="admin-page-btn"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages || loading}
        aria-label="Página siguiente"
      >
        <span>Siguiente</span>
        <CaretRight aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

// Implements: REQ-PERF-05, REQ-TOAST-01, REQ-URL-01, REQ-VIRT-01
export function AdminView() {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: true })
  );
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: true, throttleMs: 300 })
  );
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<AcademicPeriodSummary[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [archivingPeriod, setArchivingPeriod] = useState("");

  const fetchAccounts = useCallback(
    async (targetPage: number, query: string) => {
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
    },
    [setPage]
  );

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
  }, [page, searchQuery, setPage]);

  useEffect(() => {
    let active = true;
    loadAcademicPeriods()
      .then((items) => {
        if (active) setPeriods(items);
      })
      .finally(() => {
        if (active) setPeriodsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const archivePeriod = async (period: AcademicPeriodSummary) => {
    if (
      !window.confirm(
        `¿Archivar ${period.nombre}? Sus ramos quedarán disponibles únicamente en modo lectura.`
      )
    )
      return;
    setArchivingPeriod(period.id);
    try {
      await toast.promise(archiveAcademicPeriod(period.id), {
        loading: `Archivando ${period.nombre}...`,
        success: `Período ${period.nombre} archivado. Sus ramos quedaron en modo lectura.`,
        error: (cause) =>
          cause instanceof Error ? cause.message : "No fue posible archivar el período.",
      });
      setPeriods(await loadAcademicPeriods());
    } catch {
      // Error manejado visualmente por el toast.promise
    } finally {
      setArchivingPeriod("");
    }
  };

  const changeRole = async (userId: string, role: "teacher" | "student") => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (response.ok) {
        // Dual-store sync: /api/admin/users ejecuta la mutación transaccional en Turso y Firestore; updateRemoteUserRole en cliente fue descartado para evitar escrituras redundantes.
        const successMsg = "Rol actualizado exitosamente en la base de datos.";
        toast.success(successMsg);
        await fetchAccounts(page, searchQuery);
      } else {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        const errMsg = data.error ?? "No fue posible actualizar el rol.";
        toast.error(errMsg);
      }
    } catch {
      const errMsg = "No fue posible conectar con el servidor de administración.";
      toast.error(errMsg);
    }
  };

  return (
    <section>
      <div className="page-head lead">
        <h1>Administración de cuentas</h1>
        {/* Implements: REQ-DELIB-02 */}
        <p>
          <span>
            <b className="num">{total}</b>{" "}
            {total === 1 ? "cuenta registrada" : "cuentas registradas"}
            {searchQuery.trim() ? " (filtradas)" : ""}
          </span>
          <span>·</span>
          <span>el rango se asigna por dominio institucional</span>
        </p>
      </div>

      <AdminPeriodsSection
        archivingPeriod={archivingPeriod}
        onArchivePeriod={archivePeriod}
        periods={periods}
        periodsLoading={periodsLoading}
      />

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
              <X aria-hidden="true" size={14} />
            </button>
          )}
        </div>
      </div>

      <AdminAccountsTable
        accounts={accounts}
        loading={loading}
        onChangeRole={changeRole}
        searchQuery={searchQuery}
      />

      <AdminPagination
        loading={loading}
        onPageChange={(newPage) => setPage(newPage)}
        page={page}
        totalPages={totalPages}
      />
    </section>
  );
}
