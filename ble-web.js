// Add-on to the existing pixel-friends prototype. The original screens remain intact.
// This first stage connects to a NU40-DK over Nordic UART Service (NUS).
const BLE_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

const deviceLink = { device: null, tx: null, rx: null, status: '연결되지 않음', lastMessage: '' };

function isBluetoothSupported() {
  return !!navigator.bluetooth && window.isSecureContext;
}

function addDeviceConnectUI() {
  // Add the actual connection button without removing the existing demo flow.
  const target = state.page === 'connect' ? document.querySelector('.connectCard') :
    state.page === 'home' && state.tab === 'my' ? document.querySelector('.previewCard') : null;
  if (!target || document.querySelector('#realBleCard')) return;

  const wrap = document.createElement('section');
  wrap.id = 'realBleCard';
  wrap.className = 'connectCard';
  wrap.style.cssText = 'margin:18px 0;padding:18px;';
  wrap.innerHTML = `
    <b>📡 실제 NU40-DK 연결</b>
    <p id="realBleStatus" class="muted" style="margin:10px 0">${deviceLink.status}</p>
    <button class="primary" id="realBleButton" type="button">블루투스로 기기 연결하기</button>
    <p class="muted" style="font-size:12px;margin-top:12px">
      맥북 Chrome / HTTPS 환경에서 연결해 주세요.<br>
      아이폰 Safari는 Web Bluetooth를 지원하지 않습니다.
    </p>
    <p id="realBleMessage" class="muted" style="font-size:12px"></p>`;
  target.insertAdjacentElement('afterend', wrap);
  document.querySelector('#realBleButton').onclick = connectNU40;
  updateDeviceUI();
}

function updateDeviceUI() {
  const status = document.querySelector('#realBleStatus');
  const button = document.querySelector('#realBleButton');
  const message = document.querySelector('#realBleMessage');
  if (status) status.textContent = deviceLink.status;
  if (message) message.textContent = deviceLink.lastMessage;
  if (button) button.textContent = deviceLink.device?.gatt?.connected ? '기기 연결 해제' : '블루투스로 기기 연결하기';
}

async function connectNU40() {
  if (deviceLink.device?.gatt?.connected) {
    deviceLink.device.gatt.disconnect();
    return;
  }
  if (!isBluetoothSupported()) {
    deviceLink.status = '이 브라우저에서는 직접 BLE 연결을 사용할 수 없어요.';
    deviceLink.lastMessage = '맥북 Chrome에서 배포된 HTTPS 사이트를 열어 주세요.';
    updateDeviceUI();
    return;
  }
  try {
    deviceLink.status = '기기를 선택해 주세요...';
    updateDeviceUI();
    // Must be called from the user's button click.
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'PIXEL_FRIEND' }],
      optionalServices: [BLE_UART_SERVICE]
    });
    deviceLink.device = device;
    device.addEventListener('gattserverdisconnected', () => {
      deviceLink.status = '연결이 끊어졌어요.';
      deviceLink.tx = null;
      deviceLink.rx = null;
      updateDeviceUI();
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(BLE_UART_SERVICE);
    deviceLink.tx = await service.getCharacteristic(BLE_UART_TX);
    deviceLink.rx = await service.getCharacteristic(BLE_UART_RX);
    await deviceLink.tx.startNotifications();
    deviceLink.tx.addEventListener('characteristicvaluechanged', event => {
      const value = event.target.value;
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      deviceLink.lastMessage = new TextDecoder().decode(bytes).trim();
      updateDeviceUI();
    });
    deviceLink.status = `연결됨: ${device.name || 'NU40-DK'}`;
    deviceLink.lastMessage = '실제 보드가 연결됐어요. 친구 기록 저장은 다음 단계에서 추가합니다.';
    updateDeviceUI();
    await deviceLink.rx.writeValue(new TextEncoder().encode('HELLO\n'));
  } catch (error) {
    deviceLink.status = '연결 실패 또는 취소됨';
    deviceLink.lastMessage = error?.message || String(error);
    updateDeviceUI();
  }
}

// Extend the existing renderer; don't replace the original site design and flow.
const existingRenderWithAvatar = render;
render = function () {
  existingRenderWithAvatar();
  addDeviceConnectUI();
};
render();
