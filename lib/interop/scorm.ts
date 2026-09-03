export function createScormRuntime(
  kind: "scorm12" | "scorm2004",
  initial: Record<string, string>,
  commit: (data: Record<string, string>) => boolean
) {
  const is12 = kind === "scorm12";
  const data: Record<string, string> = { ...initial };
  const location = is12 ? "cmi.core.lesson_location" : "cmi.location";
  const status = is12 ? "cmi.core.lesson_status" : "cmi.completion_status";
  const defaults: Record<string, string> = is12
    ? {
        "cmi.core.student_id": "",
        "cmi.core.student_name": "",
        "cmi.core.lesson_mode": "normal",
        "cmi.core.credit": "credit",
        "cmi.core.entry": "ab-initio",
        "cmi.core.total_time": "0000:00:00.00",
        "cmi.core.lesson_status": "not attempted",
        "cmi.core.score.raw": "",
        "cmi.core.score.min": "",
        "cmi.core.score.max": "",
        "cmi.core.exit": "",
        "cmi.core.session_time": "0000:00:00.00",
      }
    : {
        "cmi.learner_id": "",
        "cmi.learner_name": "",
        "cmi.mode": "normal",
        "cmi.credit": "credit",
        "cmi.entry": "ab-initio",
        "cmi.total_time": "PT0S",
        "cmi.completion_status": "unknown",
        "cmi.success_status": "unknown",
        "cmi.score.scaled": "",
        "cmi.score.raw": "",
        "cmi.score.min": "",
        "cmi.score.max": "",
        "cmi.progress_measure": "",
        "cmi.exit": "",
        "cmi.session_time": "PT0S",
      };
  defaults[location] = "";
  defaults["cmi.suspend_data"] = "";
  defaults["cmi.launch_data"] = "";
  for (const [key, value] of Object.entries(defaults)) if (!(key in data)) data[key] = value;
  const writeOnly = new Set(
    is12 ? ["cmi.core.exit", "cmi.core.session_time"] : ["cmi.exit", "cmi.session_time"]
  );
  const readOnly = new Set(
    is12
      ? [
          "cmi.core.student_id",
          "cmi.core.student_name",
          "cmi.core.lesson_mode",
          "cmi.core.credit",
          "cmi.core.entry",
          "cmi.core.total_time",
          "cmi.launch_data",
        ]
      : [
          "cmi.learner_id",
          "cmi.learner_name",
          "cmi.mode",
          "cmi.credit",
          "cmi.entry",
          "cmi.total_time",
          "cmi.launch_data",
        ]
  );
  let initialized = false;
  let terminated = false;
  let error = "0";
  const result = (code = "0") => {
    error = code;
    return code === "0" ? "true" : "false";
  };
  const ready = () => {
    if (!initialized || terminated) {
      error = is12 ? "301" : terminated ? "133" : "122";
      return false;
    }
    return true;
  };
  const initialize = (value: string) => {
    if (value !== "") return result("201");
    if (initialized || terminated) return result(is12 ? "101" : terminated ? "104" : "103");
    initialized = true;
    return result();
  };
  const getValue = (key: string) => {
    if (!ready()) return "";
    if (!Object.hasOwn(defaults, key)) {
      error = "401";
      return "";
    }
    if (writeOnly.has(key)) {
      error = is12 ? "404" : "405";
      return "";
    }
    error = "0";
    return data[key] ?? "";
  };
  const setValue = (key: string, value: string) => {
    if (!ready()) return "false";
    if (!Object.hasOwn(defaults, key)) return result("401");
    if (readOnly.has(key)) return result(is12 ? "403" : "404");
    if (
      typeof value !== "string" ||
      value.length >
        (key === "cmi.suspend_data"
          ? is12
            ? 4096
            : 64000
          : key === location
            ? is12
              ? 255
              : 1000
            : 200)
    )
      return result(is12 ? "405" : "406");
    if (
      key === status &&
      !(
        is12
          ? ["passed", "completed", "failed", "incomplete", "browsed", "not attempted"]
          : ["completed", "incomplete", "not attempted", "unknown"]
      ).includes(value)
    )
      return result(is12 ? "405" : "406");
    if (key === "cmi.success_status" && !["passed", "failed", "unknown"].includes(value))
      return result("406");
    if (/score\.(raw|min|max|scaled)$|progress_measure$/.test(key)) {
      const n = Number(value);
      if (
        !value.trim() ||
        !Number.isFinite(n) ||
        (key.endsWith(".scaled") && (n < -1 || n > 1)) ||
        (key.endsWith("progress_measure") && (n < 0 || n > 1))
      )
        return result(is12 ? "405" : "407");
    }
    if (
      key.endsWith(".exit") &&
      !["", "suspend", "logout", "time-out", ...(is12 ? [] : ["normal"])].includes(value)
    )
      return result(is12 ? "405" : "406");
    if (
      key.endsWith("session_time") &&
      !(
        is12
          ? /^\d{2,4}:[0-5]\d:[0-5]\d(?:\.\d{1,2})?$/
          : /^PT(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?$/
      ).test(value)
    )
      return result(is12 ? "405" : "406");
    data[key] = value;
    return result();
  };
  const save = (value: string) => {
    if (!ready()) return "false";
    if (value !== "") return result("201");
    try {
      return result(commit({ ...data }) ? "0" : is12 ? "101" : "391");
    } catch {
      return result(is12 ? "101" : "391");
    }
  };
  const finish = (value: string) => {
    const saved = save(value);
    if (saved === "true") terminated = true;
    return saved;
  };
  const getError = () => error;
  const errorString = (code: string) =>
    code === "0" ? "Sin error" : "La operación SCORM no se pudo completar (" + code + ").";
  return {
    LMSInitialize: initialize,
    LMSFinish: finish,
    LMSGetValue: getValue,
    LMSSetValue: setValue,
    LMSCommit: save,
    LMSGetLastError: getError,
    LMSGetErrorString: errorString,
    LMSGetDiagnostic: errorString,
    Initialize: initialize,
    Terminate: finish,
    GetValue: getValue,
    SetValue: setValue,
    Commit: save,
    GetLastError: getError,
    GetErrorString: errorString,
    GetDiagnostic: errorString,
  };
}

export function validateScormData(kind: "scorm12" | "scorm2004", input: Record<string, string>) {
  const runtime = createScormRuntime(kind, {}, () => true);
  runtime.Initialize("");
  const writable: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (
      value === "" &&
      /^(?:cmi\.(?:core\.)?score\.(?:raw|min|max|scaled)|cmi\.progress_measure)$/.test(key)
    )
      continue;
    const set = runtime.SetValue(key, value);
    if (set === "true") writable[key] = value;
    else if (!["403", "404"].includes(runtime.GetLastError()))
      throw new Error("El avance SCORM contiene un valor no compatible.");
  }
  return writable;
}
