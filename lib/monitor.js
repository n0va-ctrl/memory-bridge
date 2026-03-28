import { useAzureMonitor } from "@azure/monitor-opentelemetry";

let initialized = false;

export function initMonitor() {
  if (initialized) return;
  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    console.log("Azure Monitor: no connection string, skipping");
    return;
  }
  try {
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      },
    });
    initialized = true;
    console.log("Azure Monitor initialized");
  } catch (error) {
    console.error("Azure Monitor failed to initialize:", error.message);
  }
}

export function trackEvent(name, properties) {
  try {
    console.log("Monitor event:", name, properties);
  } catch (error) {
    console.error("Monitor tracking error:", error.message);
  }
}