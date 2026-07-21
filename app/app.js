const SERVICE_UUID = '7b1e0001-1f3b-4c3d-9a5e-120000000001';
const TELEMETRY_UUID = '7b1e0002-1f3b-4c3d-9a5e-120000000002';
const state = { connected: false, temperature: 24.8, humidity: 64, water: 76, soil: 56, light: 680 };
const history = { temperature: [23.8, 24.1, 23.9, 24.4, 24.3, 24.8], humidity: [60, 61, 63, 62, 65, 64] };
let demoTimer;

const $ = id => document.getElementById(id);
function sparkline(id, values, color) {
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${44 - ((v - min) / (max - min)) * 38}`).join(' ');
  $(id).innerHTML = `<svg viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true"><path d="M0 45 H100" stroke="rgba(21,56,47,.10)"/><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function update(data) {
  Object.assign(state, data);
  ['temperature', 'humidity', 'water', 'soil', 'light'].forEach(key => {
    if ($(key) && Number.isFinite(Number(state[key]))) $(key).textContent = Math.round(Number(state[key]) * 10) / 10;
  });
  $('waterFill').style.height = `${Math.max(0, Math.min(100, state.water))}%`;
  $('waterHint').textContent = state.water < 20 ? '水量偏低，请尽快补水' : `预计可维持约 ${Math.max(1, Math.round(state.water / 15))} 天`;
  $('insightText').textContent = state.soil < 35 ? '土壤偏干，建议检查水箱并安排一次浇水。' : state.temperature > 29 ? '温度偏高，建议加强通风并避开直射光。' : '当前环境稳定，无需额外浇水。保持柔和散射光即可。';
  history.temperature.push(Number(state.temperature)); history.temperature.shift();
  history.humidity.push(Number(state.humidity)); history.humidity.shift();
  sparkline('tempChart', history.temperature, '#bd7d30');
  sparkline('humidityChart', history.humidity, '#2d775f');
  $('lastUpdated').textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function setConnected(deviceName) {
  state.connected = true;
  $('statusDot').classList.add('connected');
  $('statusText').textContent = '设备已连接';
  $('deviceText').textContent = deviceName;
  $('connectButton').textContent = '已连接';
  clearInterval(demoTimer);
}
async function connect() {
  if (!navigator.bluetooth) {
    alert('当前浏览器不支持 Web Bluetooth。请使用安卓 Chrome 或 Edge，并通过 HTTPS/localhost 打开。');
    return;
  }
  try {
    $('connectButton').textContent = '搜索中…';
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }], optionalServices: [SERVICE_UUID] });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const telemetry = await service.getCharacteristic(TELEMETRY_UUID);
    await telemetry.startNotifications();
    telemetry.addEventListener('characteristicvaluechanged', event => {
      const text = new TextDecoder().decode(event.target.value);
      try { update(JSON.parse(text)); } catch (error) { console.warn('Invalid telemetry', text, error); }
    });
    device.addEventListener('gattserverdisconnected', () => location.reload());
    setConnected(device.name || 'PlantMate-ESP32');
    const first = await telemetry.readValue();
    update(JSON.parse(new TextDecoder().decode(first)));
  } catch (error) {
    $('connectButton').textContent = '连接设备';
    if (error.name !== 'NotFoundError') alert(`连接失败：${error.message}`);
  }
}
function startDemo() {
  demoTimer = setInterval(() => {
    const now = Date.now() / 1000;
    update({
      temperature: 24.6 + Math.sin(now / 8) * 1.1,
      humidity: 62 + Math.sin(now / 11 + 1) * 4,
      water: Math.max(18, state.water - .03),
      soil: 54 + Math.sin(now / 15 + 2) * 5,
      light: 650 + Math.sin(now / 7) * 90
    });
  }, 2000);
}
$('connectButton').addEventListener('click', connect);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
update(state);
startDemo();

