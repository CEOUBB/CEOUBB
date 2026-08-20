"use client";

// Implements: REQ-1:1-GEOMETRIC-LAYOUT-FIDELITY
// Implements: REQ-ACCESSIBLE-LOADING-STATE-ANNOUNCEMENT
// Implements: REQ-STAGGERED-SHIMMER-MOTION

import { Books, DeviceMobile, FolderSimple, Info, MagnifyingGlass } from "@phosphor-icons/react";

const SKELETON_DAYS = [
  { day: "LUN", num: "17" },
  { day: "MAR", num: "18" },
  { day: "MIÉ", num: "19", today: true },
  { day: "JUE", num: "20" },
  { day: "VIE", num: "21" },
  { day: "SÁB", num: "22" },
  { day: "DOM", num: "23" },
];

const SKELETON_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];

const SKELETON_FILTER_COURSES = [0, 1, 2, 3, 4];
const SKELETON_ADMIN_ROWS = [0, 1, 2, 3, 4, 5];
const SKELETON_POSTS = [0, 1, 2];

export function CalendarSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando calendario…" className="planner" role="status">
      <div className="planner-top">
        <div className="planner-title">
          <span
            className="sk"
            style={{ width: "220px", height: "34px", "--sk-delay": "50ms" } as React.CSSProperties}
          />
          <span
            className="sk"
            style={
              {
                width: "160px",
                height: "14px",
                marginTop: "6px",
                "--sk-delay": "90ms",
              } as React.CSSProperties
            }
          />
        </div>
        <div className="planner-actions">
          <span
            className="sk sk-round"
            style={{ width: "60px", height: "36px", "--sk-delay": "120ms" } as React.CSSProperties}
          />
          <span
            className="sk sk-round"
            style={{ width: "36px", height: "36px", "--sk-delay": "140ms" } as React.CSSProperties}
          />
          <span
            className="sk sk-round"
            style={{ width: "36px", height: "36px", "--sk-delay": "160ms" } as React.CSSProperties}
          />
          <span
            className="sk"
            style={
              {
                width: "130px",
                height: "36px",
                borderRadius: "var(--radius-full)",
                "--sk-delay": "180ms",
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      <div className="planner-filters" style={{ margin: "var(--space-md) 0 var(--space-lg)" }}>
        {SKELETON_FILTER_COURSES.map((idx) => (
          <span
            className="sk"
            key={`cal-filt-${idx}`}
            style={
              {
                width: `${110 + (idx % 3) * 25}px`,
                height: "32px",
                borderRadius: "var(--radius-full)",
                "--sk-delay": `${180 + idx * 40}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="planner-frame"
        style={{ "--planner-rows": SKELETON_HOURS.length } as React.CSSProperties}
      >
        <div className="planner-head">
          <span className="planner-zone">GMT−4</span>
          {SKELETON_DAYS.map((item) => (
            <div
              className="planner-headday"
              data-today={item.today ? "true" : undefined}
              key={item.day}
            >
              <small>{item.day}</small>
              <b style={item.today ? { margin: "-3px auto" } : undefined}>{item.num}</b>
            </div>
          ))}
        </div>

        <div className="planner-grid" style={{ minHeight: "480px" }}>
          <div className="planner-hours">
            {SKELETON_HOURS.map((hr) => (
              <span className="planner-hour" key={hr}>
                {hr}
              </span>
            ))}
          </div>
          {SKELETON_DAYS.map((item, colIdx) => (
            <div className="planner-col" key={`col-${item.day}`}>
              {colIdx === 1 && (
                <div
                  className="planner-block sk"
                  style={
                    {
                      top: "60px",
                      height: "110px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: "var(--radius-md)",
                      padding: "8px",
                      "--sk-delay": "260ms",
                    } as React.CSSProperties
                  }
                >
                  <span className="sk" style={{ width: "70%", height: "12px" }} />
                  <span className="sk" style={{ width: "40%", height: "10px", marginTop: "4px" }} />
                </div>
              )}
              {colIdx === 3 && (
                <div
                  className="planner-block sk"
                  style={
                    {
                      top: "140px",
                      height: "85px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: "var(--radius-md)",
                      padding: "8px",
                      "--sk-delay": "320ms",
                    } as React.CSSProperties
                  }
                >
                  <span className="sk" style={{ width: "80%", height: "12px" }} />
                  <span className="sk" style={{ width: "50%", height: "10px", marginTop: "4px" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ResourcesSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando recursos de estudio…"
      className="resources-hub"
      role="status"
    >
      <div className="page-head lead">
        <span
          className="sk boot-title"
          style={{ width: "280px", height: "36px", "--sk-delay": "50ms" } as React.CSSProperties}
        />
        <span
          className="sk boot-subtitle"
          style={
            {
              width: "min(90%, 540px)",
              height: "14px",
              marginTop: "8px",
              "--sk-delay": "90ms",
            } as React.CSSProperties
          }
        />
      </div>

      <div className="resource-block">
        <div className="section-title">
          <span
            className="sk"
            style={{ width: "190px", height: "22px", "--sk-delay": "120ms" } as React.CSSProperties}
          />
        </div>
        <div className="resource-layout">
          <div className="resource-card" style={{ "--sk-delay": "160ms" } as React.CSSProperties}>
            <span className="resource-icon">
              <Books size={22} />
            </span>
            <span className="sk" style={{ width: "65%", height: "20px" }} />
            <span className="sk" style={{ width: "90%", height: "14px", marginTop: "4px" }} />
            <div style={{ display: "grid", gap: "8px", margin: "12px 0" }}>
              <span className="sk" style={{ width: "85%", height: "12px" }} />
              <span className="sk" style={{ width: "80%", height: "12px" }} />
              <span className="sk" style={{ width: "75%", height: "12px" }} />
            </div>
            <span className="sk" style={{ width: "130px", height: "14px", marginTop: "auto" }} />
          </div>

          <div className="resource-card" style={{ "--sk-delay": "220ms" } as React.CSSProperties}>
            <span className="resource-icon">
              <DeviceMobile size={22} />
            </span>
            <span className="sk" style={{ width: "50%", height: "20px" }} />
            <span className="sk" style={{ width: "85%", height: "14px", marginTop: "4px" }} />
            <div style={{ display: "flex", gap: "10px", margin: "16px 0" }}>
              <span
                className="sk"
                style={{ width: "110px", height: "36px", borderRadius: "var(--radius-md)" }}
              />
              <span
                className="sk"
                style={{ width: "110px", height: "36px", borderRadius: "var(--radius-md)" }}
              />
            </div>
            <span className="sk" style={{ width: "170px", height: "14px", marginTop: "auto" }} />
          </div>
        </div>
      </div>

      <div className="resource-block">
        <div className="section-title">
          <span
            className="sk"
            style={{ width: "260px", height: "22px", "--sk-delay": "260ms" } as React.CSSProperties}
          />
        </div>
        <div className="tier-group">
          <div className="tier-head">
            <span
              className="sk"
              style={
                {
                  width: "180px",
                  height: "24px",
                  borderRadius: "var(--radius-full)",
                  "--sk-delay": "290ms",
                } as React.CSSProperties
              }
            />
          </div>
          <ul className="chip-grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[0, 1, 2, 3].map((chip) => (
              <li key={`ai-chip-${chip}`}>
                <span
                  className="brand-chip sk"
                  style={
                    {
                      width: "100%",
                      height: "46px",
                      "--sk-delay": `${320 + chip * 40}ms`,
                    } as React.CSSProperties
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="resource-block">
        <div className="section-title">
          <span
            className="sk"
            style={{ width: "300px", height: "22px", "--sk-delay": "380ms" } as React.CSSProperties}
          />
        </div>
        <ul className="brand-grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[0, 1, 2, 3].map((tile) => (
            <li key={`perk-tile-${tile}`}>
              <div
                className="brand-tile sk"
                style={
                  {
                    width: "100%",
                    height: "92px",
                    "--sk-delay": `${420 + tile * 40}ms`,
                  } as React.CSSProperties
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AdminSkeleton() {
  return (
    <section aria-busy="true" aria-label="Cargando administración de cuentas…" role="status">
      <div className="page-head lead">
        <span
          className="sk boot-title"
          style={{ width: "320px", height: "36px", "--sk-delay": "50ms" } as React.CSSProperties}
        />
        <span
          className="sk boot-subtitle"
          style={
            {
              width: "240px",
              height: "14px",
              marginTop: "8px",
              "--sk-delay": "90ms",
            } as React.CSSProperties
          }
        />
      </div>

      <div className="admin-toolbar" style={{ margin: "var(--space-lg) 0" }}>
        <div className="admin-search-box">
          <MagnifyingGlass aria-hidden="true" className="admin-search-icon" size={18} />
          <span
            className="sk"
            style={
              {
                width: "220px",
                height: "16px",
                marginLeft: "8px",
                "--sk-delay": "130ms",
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      <div className="admin-table">
        <div className="admin-head">
          <span>Cuenta</span>
          <span>Rango</span>
          <span>Acción</span>
        </div>
        {SKELETON_ADMIN_ROWS.map((row) => (
          <div
            className="admin-row"
            key={`admin-row-${row}`}
            style={{ "--sk-delay": `${160 + row * 45}ms` } as React.CSSProperties}
          >
            <span>
              <span className="sk" style={{ width: `${140 + (row % 3) * 30}px`, height: "15px" }} />
              <span
                className="sk"
                style={{ width: `${180 + (row % 2) * 40}px`, height: "12px", marginTop: "4px" }}
              />
            </span>
            <span>
              <span
                className="sk"
                style={{ width: "80px", height: "24px", borderRadius: "var(--radius-full)" }}
              />
            </span>
            <span>
              <span
                className="sk"
                style={{ width: "110px", height: "32px", borderRadius: "var(--radius-md)" }}
              />
            </span>
          </div>
        ))}
      </div>

      <div className="admin-pagination" style={{ marginTop: "var(--space-md)" }}>
        <span className="admin-page-btn sk" style={{ width: "90px", height: "36px" }} />
        <span className="admin-page-info sk" style={{ width: "120px", height: "16px" }} />
        <span className="admin-page-btn sk" style={{ width: "90px", height: "36px" }} />
      </div>
    </section>
  );
}

export function ClassroomSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Abriendo aula virtual…"
      className="classroom-layout"
      role="status"
    >
      <main className="classroom-main">
        <header className="classroom-top">
          <div>
            <span className="breadcrumb">
              <span
                className="sk"
                style={
                  { width: "160px", height: "13px", "--sk-delay": "40ms" } as React.CSSProperties
                }
              />
            </span>
            <span
              className="sk boot-title"
              style={
                {
                  width: "min(80%, 420px)",
                  height: "36px",
                  marginTop: "4px",
                  "--sk-delay": "80ms",
                } as React.CSSProperties
              }
            />
          </div>
          <div className="classroom-meta">
            <span
              className="course-reference sk"
              style={
                { width: "130px", height: "34px", "--sk-delay": "110ms" } as React.CSSProperties
              }
            />
          </div>
        </header>

        <nav aria-label="Secciones del aula" className="course-tabs">
          {["Novedades", "Evaluaciones", "Materiales", "Personas", "Progreso"].map(
            (tabName, idx) => (
              <button
                className={idx === 0 ? "active" : ""}
                key={tabName}
                style={{ pointerEvents: "none" }}
                type="button"
              >
                {idx === 0 && <FolderSimple size={18} />}
                {tabName}
              </button>
            )
          )}
        </nav>

        <div className="classroom-columns">
          <section>
            {SKELETON_POSTS.map((post) => (
              <article
                className="post-card"
                key={`post-${post}`}
                style={
                  {
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-lg)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    "--sk-delay": `${160 + post * 70}ms`,
                  } as React.CSSProperties
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="sk sk-round" style={{ width: "36px", height: "36px" }} />
                  <div>
                    <span className="sk" style={{ width: "140px", height: "14px" }} />
                    <span
                      className="sk"
                      style={{ width: "90px", height: "11px", marginTop: "4px" }}
                    />
                  </div>
                </div>
                <span className="sk" style={{ width: "95%", height: "14px", marginTop: "6px" }} />
                <span className="sk" style={{ width: "80%", height: "14px" }} />
                {post === 0 && (
                  <span
                    className="sk"
                    style={{
                      width: "200px",
                      height: "34px",
                      borderRadius: "var(--radius-md)",
                      marginTop: "4px",
                    }}
                  />
                )}
              </article>
            ))}
          </section>

          <aside className="course-rail">
            <div className="section-title compact-title">
              <h2>
                <Info aria-hidden="true" size={19} weight="fill" />
                Información del ramo
              </h2>
            </div>
            <div
              className="course-facts"
              style={{
                padding: "var(--space-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div>
                <span className="sk" style={{ width: "90px", height: "11px" }} />
                <span className="sk" style={{ width: "160px", height: "15px", marginTop: "4px" }} />
                <span className="sk" style={{ width: "130px", height: "11px", marginTop: "2px" }} />
              </div>
              <div style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: "12px" }}>
                <span className="sk" style={{ width: "70px", height: "11px" }} />
                <span className="sk" style={{ width: "120px", height: "15px", marginTop: "4px" }} />
                <span
                  className="sk"
                  style={{
                    width: "100%",
                    height: "8px",
                    borderRadius: "var(--radius-full)",
                    marginTop: "8px",
                  }}
                />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
