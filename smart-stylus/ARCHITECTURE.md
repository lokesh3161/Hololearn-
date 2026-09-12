# Smart Stylus Subsystem — Five-Phase System Architecture

```text
[ Physical / Virtual Pen ]
            │ (Position, Pressure, Contact, Timestamp)
            ▼
[ BLE Binary Protocol (GATT Service 183A) ]
            │
            ▼
[ StylusConnectionManager (Explicit State Machine) ]
            │
            ▼
[ HoloLearnStylusAdapter ]
            │
            ▼
[ HoloLearn Blackboard Canvas (Raw Digital Ink) ]
```

## Phase Breakdown

1. **Phase 1 — Digital Prototype & Simulator (IMPLEMENTED)**
   - Hardware-neutral `SmartPenPoint` data model.
   - Virtual BLE binary encoder/decoder transport.
   - Unobtrusive developer simulator control panel.

2. **Phase 2 — FSR Tip Pressure Sensor (PLANNED)**
   - Analog FSR sensor mapped via ESP32 ADC pin to normalized pressure range 0.0–1.0.

3. **Phase 3 — Ultrasonic 2D Positioning (PLANNED)**
   - 4 acoustic anchor transducers using Time-of-Flight (ToF) multilateration to calculate precise (X, Y) wall coordinates.

4. **Phase 4 — Real Smart Pen Integration Boundary (IMPLEMENTED)**
   - Universal `HoloLearnStylusAdapter` bridging `SmartPenPoint` streams directly into `boardStore` digital ink.

5. **Phase 5 — Projector Wall Surface Calibration (PLANNED)**
   - 4-point homography transformation matrix mapping physical projected wall coordinates to digital canvas pixel space.
