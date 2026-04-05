import { availableParallelism } from "node:os";

function parseBoolean(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["0", "false", "no", "off", "single"].includes(normalized)) {
    return false;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  return fallback;
}

function parsePositiveInteger(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getTotalCpuCount() {
  try {
    return Math.max(1, availableParallelism());
  } catch {
    return 1;
  }
}

function getRecommendedWorkers(service, totalCpuCount) {
  const backendWorkers = Math.max(1, Math.floor(totalCpuCount / 4));

  if (service === "backend") {
    return backendWorkers;
  }

  if (service === "proxy") {
    return Math.max(1, totalCpuCount - backendWorkers);
  }

  return totalCpuCount;
}

export function getClusterSettings({ service }) {
  const totalCpuCount = getTotalCpuCount();
  const enabled = parseBoolean(
    process.env[`${service.toUpperCase()}_CLUSTER_ENABLED`] ?? process.env.CLUSTER_ENABLED,
    true,
  );
  const requestedWorkers = parsePositiveInteger(
    process.env[`${service.toUpperCase()}_CLUSTER_WORKERS`] ?? process.env.CLUSTER_WORKERS,
  );
  const recommendedWorkers = getRecommendedWorkers(service, totalCpuCount);
  const workers = enabled ? Math.max(1, requestedWorkers ?? recommendedWorkers) : 1;

  return {
    service,
    enabled: enabled && workers > 1,
    workers,
    recommendedWorkers,
    totalCpuCount,
  };
}

export function formatClusterLabel(settings) {
  return settings.enabled
    ? `cluster ${settings.workers}/${settings.totalCpuCount} workers`
    : "single process";
}
