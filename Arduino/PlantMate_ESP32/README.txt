PlantMate ESP32 — Arduino IDE 使用说明

1. 用 Arduino IDE 打开 PlantMate_ESP32.ino。
2. 在“开发板管理器”安装 Espressif Systems 的 esp32 开发板支持包。
3. 开发板选择：ESP32 Dev Module。
4. 选择电脑识别到的 USB 串口。
5. 点击“验证”编译，再点击“上传”。
6. 串口监视器波特率选择 115200。

运行后，手机端搜索的蓝牙设备名为 PlantMate-ESP32。
固件每 2 秒发送一次温度、空气湿度、水量、土壤湿度和光照模拟数据。

