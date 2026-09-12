# HoloLearn AI — Smart Stylus Subsystem

## Overview
The **Smart Stylus Subsystem** provides a software architecture and digital BLE simulator for a physical classroom smart stylus. The system enables teachers and students to write on physical walls, projector screens, or classroom blackboards while transmitting real-time coordinate, pressure, and contact data into HoloLearn AI.

## Current Phase: Phase 1 (Digital Prototype)
- **Implemented**: BLE Binary Protocol, VirtualStylus simulator, StylusConnectionManager, HoloLearnStylusAdapter, and Developer Control Panel UI.
- **Planned (Future Hardware)**: ESP32-S3 microcontroller, FSR tip pressure sensor, ultrasonic 2D positioning anchors, and projector 4-point surface calibration.

## Quick Start
1. Open HoloLearn AI Smartboard.
2. Click **Stylus** in the top navigation bar to open the **Smart Stylus Simulator Panel**.
3. Click **Connect**.
4. Drag the virtual pen across the touchpad: observe the digital cursor tracking on canvas.
5. Toggle **Contact ON**: Drag to generate raw digital ink on the blackboard canvas.
