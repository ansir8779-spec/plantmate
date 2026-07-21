# PlantMate 智能植物种植机

本项目包含两个可直接联调的部分：

- `firmware/`：ESP32 Arduino BLE 固件，每 2 秒发送一组 JSON 模拟数据。
- `Arduino/PlantMate_ESP32/`：可由 Arduino IDE 直接打开的标准 `.ino` 工程。
- `app/`：可安装到安卓主屏幕的 PWA，通过 Web Bluetooth 订阅 ESP32 数据。

## 运行手机端

在 `app` 目录启动本地 HTTPS 或 localhost 服务。电脑预览可运行：

```bash
cd app
python3 -m http.server 8080
```

浏览器访问 `http://localhost:8080`。蓝牙连接请使用安卓 Chrome/Edge；手机访问时需要 HTTPS 安全地址。未连接开发板时，界面自动使用模拟数据。

## 编译与烧录 ESP32

```bash
cd firmware
pio run
pio run --target upload --upload-port /dev/cu.usbserial-xxxx
pio device monitor --baud 115200
```

设备名：`PlantMate-ESP32`。BLE 数据格式示例：

```json
{"temperature":24.8,"humidity":63.2,"water":76.0,"soil":55.1,"light":680,"uptime":120,"demo":true}
```

后续接真实硬件时，只需替换 `firmware/src/main.cpp` 中的 `readSensors()`，保持字段名不变，App 无需修改。
