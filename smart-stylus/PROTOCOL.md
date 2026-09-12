# Smart Stylus Binary Protocol & BLE Specification

## Packet Format (12 Bytes)
```text
Byte 0    : Magic Header (0xAA)
Byte 1-2  : X Coordinate (Uint16 Big-Endian)
Byte 3-4  : Y Coordinate (Uint16 Big-Endian)
Byte 5    : Pressure (Uint8 0..255)
Byte 6    : Contact State (Uint8 0 = Hover, 1 = Contact)
Byte 7-10 : Timestamp (Uint32 Big-Endian)
Byte 11   : XOR Checksum (Bytes 0..10)
```
