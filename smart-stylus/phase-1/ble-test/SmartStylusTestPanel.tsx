import { useEffect, useRef, useState } from "react";
import {
  SmartStylusBLE,
  SmartPenData,
} from "./SmartStylusBLE";

export default function SmartStylusTestPanel() {
  const stylusRef = useRef<SmartStylusBLE | null>(null);

  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState("—");

  const [data, setData] = useState<SmartPenData>({
    x: 0,
    y: 0,
    pressure: 0,
    contact: 0,
    sequence: 0,
    packetRate: 0,
    latency: 0,
    droppedPackets: 0,
  });

  useEffect(() => {
    const stylus = new SmartStylusBLE();

    stylusRef.current = stylus;

    stylus.onConnectionChange = (state) => {
      setConnected(state);

      if (!state) {
        setDeviceName("—");
      }
    };

    stylus.onData = (packet) => {
      setData(packet);
    };

    return () => {
      stylus.disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      const stylus = stylusRef.current;

      if (!stylus) return;

      await stylus.connect();

      setDeviceName(stylus.getDeviceName());
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to Smart Stylus."
      );
    }
  };

  const disconnect = () => {
    stylusRef.current?.disconnect();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "white",
        padding: "40px",
        fontFamily: "Inter, monospace, sans-serif",
        position: "relative",
        zIndex: 9999,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", letterSpacing: "-0.5px" }}>SMART STYLUS</h1>
          <p style={{ margin: "4px 0 0 0", color: "#888", fontSize: "14px" }}>
            Phase 2A Hardware BLE & Physical Contact Test Panel
          </p>
        </div>

        <div style={{ background: "#18181b", padding: "8px 16px", borderRadius: "8px", border: "1px solid #27272a" }}>
          <span style={{ fontSize: "12px", color: "#a1a1aa", marginRight: "8px" }}>SOURCE:</span>
          <span style={{ color: "#38bdf8", fontWeight: "bold", fontSize: "12px" }}>ESP32 PHYSICAL</span>
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 20 }}>
        <div>
          <strong>Status: </strong>
          <span
            style={{
              color: connected ? "#4ade80" : "#f87171",
              fontWeight: "bold",
            }}
          >
            {connected ? "● CONNECTED" : "● DISCONNECTED"}
          </span>
        </div>

        <div>
          <strong>Device: </strong>
          <span style={{ color: "#e4e4e7" }}>{deviceName}</span>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {!connected ? (
          <button
            onClick={connect}
            style={{
              padding: "10px 24px",
              background: "#22c55e",
              color: "black",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Connect Smart Stylus
          </button>
        ) : (
          <button
            onClick={disconnect}
            style={{
              padding: "10px 24px",
              background: "#ef4444",
              color: "white",
              fontWeight: "bold",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Main Metric Cards */}
      <div
        style={{
          marginTop: 32,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
          gap: 16,
          maxWidth: 900,
        }}
      >
        <Metric label="X Coordinate" value={data.x} unit="px" />
        <Metric label="Y Coordinate" value={data.y} unit="px" />
        <Metric
          label="Contact State"
          value={data.contact === 1 ? "CONTACT" : "HOVER"}
          highlight={data.contact === 1}
        />
        <Metric
          label="Tip Pressure"
          value={data.pressure.toFixed(2)}
        />
      </div>

      {/* Telemetry Metrics */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
          gap: 16,
          maxWidth: 900,
        }}
      >
        <Metric label="Packet Rate" value={`${data.packetRate || 0} Hz`} />
        <Metric label="Latency" value={`${data.latency || 0} ms`} />
        <Metric label="Dropped Packets" value={data.droppedPackets} />
        <Metric label="Sequence" value={data.sequence || "—"} />
      </div>

      {/* Canvas Position Target Visualizer */}
      <div
        style={{
          marginTop: 40,
          width: 900,
          height: 420,
          border: "1px solid #27272a",
          borderRadius: "12px",
          position: "relative",
          background: "#09090b",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 12, left: 16, fontSize: "12px", color: "#71717a" }}>
          Target Canvas Bounds (1200 x 800)
        </div>

        <div
          style={{
            position: "absolute",
            left: `${Math.min(Math.max(data.x / 1200, 0), 1) * 100}%`,
            top: `${Math.min(Math.max(data.y / 800, 0), 1) * 100}%`,
            width: data.contact === 1 ? 18 : 12,
            height: data.contact === 1 ? 18 : 12,
            borderRadius: "50%",
            background: data.contact === 1 ? "#34d399" : "#38bdf8",
            boxShadow: data.contact === 1 ? "0 0 16px #34d399" : "0 0 8px #38bdf8",
            transform: "translate(-50%, -50%)",
            transition: "all 0.05s ease-out",
          }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        border: highlight ? "1px solid #34d399" : "1px solid #27272a",
        background: highlight ? "rgba(52,211,153,0.08)" : "#121215",
        padding: "16px",
        borderRadius: "10px",
      }}
    >
      <div style={{ opacity: 0.6, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginTop: "6px",
          color: highlight ? "#34d399" : "#f4f4f5",
        }}
      >
        {value} {unit && <span style={{ fontSize: "12px", color: "#a1a1aa" }}>{unit}</span>}
      </div>
    </div>
  );
}
