import { spawn, spawnSync } from "node:child_process";

/**
 * Resolve the grok binary. Honors GROK_BIN so users with a non-standard
 * install location (or a wrapper) can override it.
 */
export function grokBinary() {
  return process.env.GROK_BIN?.trim() || "grok";
}

/**
 * Check whether a binary responds to the given probe args.
 * Returns { available, detail } without throwing.
 */
export function binaryAvailable(binary, args, options = {}) {
  try {
    const result = spawnSync(binary, args, {
      cwd: options.cwd,
      encoding: "utf8",
      timeout: options.timeout ?? 10_000
    });
    if (result.error) {
      return { available: false, detail: result.error.message };
    }
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || "").trim() || `exited with code ${result.status}`;
      return { available: false, detail };
    }
    return { available: true, detail: (result.stdout || "").trim() };
  } catch (error) {
    return { available: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Run a command to completion, capturing stdout/stderr.
 * Supports an AbortSignal and an onStdoutLine callback for streaming.
 */
export function runCommand(binary, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";

    const onAbort = () => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2_000).unref?.();
    };
    if (options.signal) {
      if (options.signal.aborted) {
        onAbort();
      } else {
        options.signal.addEventListener("abort", onAbort, { once: true });
      }
    }

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (options.onStdoutLine) {
        stdoutBuffer += chunk;
        let index;
        while ((index = stdoutBuffer.indexOf("\n")) !== -1) {
          const line = stdoutBuffer.slice(0, index);
          stdoutBuffer = stdoutBuffer.slice(index + 1);
          if (line.trim()) {
            options.onStdoutLine(line);
          }
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      options.signal?.removeEventListener?.("abort", onAbort);
      reject(error);
    });

    child.on("close", (code, signal) => {
      options.signal?.removeEventListener?.("abort", onAbort);
      if (options.onStdoutLine && stdoutBuffer.trim()) {
        options.onStdoutLine(stdoutBuffer);
      }
      resolve({ code, signal, stdout, stderr });
    });
  });
}

/** Test whether a process is still alive. */
export function processAlive(pid) {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

/** Best-effort terminate a pid (SIGTERM then SIGKILL). */
export function terminateProcess(pid) {
  if (!processAlive(pid)) {
    return false;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return false;
  }
  setTimeout(() => {
    if (processAlive(pid)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        /* already gone */
      }
    }
  }, 2_000).unref?.();
  return true;
}
