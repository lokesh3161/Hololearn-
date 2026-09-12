# Phase 2 — Physical FSR Pressure Sensor Integration (PLANNED)

## Overview
Phase 2 will interface a Force-Sensitive Resistor (FSR) connected to an ESP32-S3 analog ADC pin.

## Planned Hardware Flow
```text
FSR Tip Sensor -> ESP32-S3 ADC Pin -> Logarithmic Normalization -> Pressure (0.0 to 1.0) -> BLE Packet -> Smartboard
```
*Note: This phase is documented for future hardware integration and is not active in the current digital prototype.*
