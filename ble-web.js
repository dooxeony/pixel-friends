// Add-on to the existing pixel-friends prototype. The original screens remain intact.
// This first stage connects to a NU40-DK over Nordic UART Service (NUS).
const BLE_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

const deviceLink = { device: null, tx: null, rx: null, status: '연결되지 않음', lastMessage: '' };
let displaySyncTimer = null;
let uartReceiveBuffer = '';
const meetingDecoder = new TextDecoder();
const peerProfileParts = new Map();

function saveMeetingLine(line) {
  const match = /^MEET:(\d+):(\d+):(.+)$/.exec(line);
  if (!match) return false;
  const peerId = Number(match[1]);
  const avatar = Number(match[2]);
  const nick = match[3].trim();
  if (![1, 2].includes(peerId) || !Number.isInteger(avatar) || avatar < 0 || avatar > 4 || !nick) return false;
  let meetings = [];
  try { meetings = JSON.parse(localStorage.getItem('littleMeetMeetings') || '[]'); } catch {}
  meetings.unshift({ peerId, avatar, nick, metAt: new Date().toISOString() });
  try { localStorage.setItem('littleMeetMeetings', JSON.stringify(meetings.slice(0, 100))); } catch {}
  return true;
}


function saveFriendLine(line) {
  const match = /^FRIEND:(\d+):(\d+)(?::([^:]+)(?::(.*))?)?$/.exec(line);
  if (!match) return false;
  const peerId = Number(match[1]);
  const avatar = Number(match[2]);
  const nick = (match[3] || '친구').trim();
  const intro = Array.from(match[4] || '').slice(0, 30).join('');
  if (![1, 2].includes(peerId) || !Number.isInteger(avatar) || avatar < 0 || avatar > 4) return false;
  let friends = [];
  try { friends = JSON.parse(localStorage.getItem('littleMeetFriends') || '[]'); } catch {}
  const existing = friends.find(friend => Number(friend.peerId) === peerId);
  if (existing) { if(match[3])existing.nick = nick; existing.avatar = avatar; if(match[4]!==undefined)existing.intro = intro; }
  else friends.unshift({ peerId, avatar, nick, intro, addedAt: new Date().toISOString() });
  try { localStorage.setItem('littleMeetFriends', JSON.stringify(friends.slice(0, 100))); } catch {}
  return true;
}

function saveChunkedFriendProfileLine(line) {
  const match = /^P:(\d+):(\d+):(\d+):(\d+):(.*)$/.exec(line);
  if (!match) return false;
  const peerId = Number(match[1]), avatar = Number(match[2]);
  const part = Number(match[3]), total = Number(match[4]), chunk = match[5];
  if (![1, 2].includes(peerId) || !Number.isInteger(avatar) || avatar < 0 || avatar > 4 ||
      !Number.isInteger(total) || total < 1 || total > 40 || part < 0 || part >= total) return false;

  let assembly = peerProfileParts.get(peerId);
  if (!assembly || part === 0 || assembly.total !== total) {
    assembly = { avatar, total, chunks: Array(total).fill(null) };
    peerProfileParts.set(peerId, assembly);
  }
  assembly.avatar = avatar;
  assembly.chunks[part] = chunk;
  if (assembly.chunks.some(item => item === null)) return false;

  const profile = assembly.chunks.join('');
  const separator = profile.indexOf('|');
  if (separator < 0) return false;
  const nick = Array.from(profile.slice(0, separator)).slice(0, 10).join('');
  const intro = Array.from(profile.slice(separator + 1)).slice(0, 30).join('');
  let friends = [];
  try { friends = JSON.parse(localStorage.getItem('littleMeetFriends') || '[]'); } catch {}
  const friend = friends.find(item => Number(item.peerId) === peerId);
  if (!friend) return false;
  const changed = friend.nick !== nick || friend.avatar !== avatar || friend.intro !== intro;
  if (!changed) return false;
  friend.nick = nick;
  friend.avatar = avatar;
  friend.intro = intro;
  try { localStorage.setItem('littleMeetFriends', JSON.stringify(friends)); } catch {}
  return true;
}

function saveFriendProfileLine(line) {
  const match = /^PROFILE:(\d+):(\d+):([^:]+)(?::(.*))?$/.exec(line);
  if (!match) return false;
  const peerId = Number(match[1]);
  const avatar = Number(match[2]);
  const nick = match[3].trim();
  const intro = Array.from(match[4] || '').slice(0, 30).join('');
  if (![1, 2].includes(peerId) || !Number.isInteger(avatar) || avatar < 0 || avatar > 4) return false;
  let friends = [];
  try { friends = JSON.parse(localStorage.getItem('littleMeetFriends') || '[]'); } catch {}
  const friend = friends.find(item => Number(item.peerId) === peerId);
  if (!friend) return false;
  friend.avatar = avatar;
  if (nick) friend.nick = nick;
  friend.intro = intro;
  try { localStorage.setItem('littleMeetFriends', JSON.stringify(friends)); } catch {}
  return true;
}

// The preset selected during registration is saved in littleMeetProfile.
// A browser supplies local time; the board has no real-time clock.
async function resetBoardProfileForRestart() {
  const pendingKey = 'littleMeetPendingBoardReset';
  try { localStorage.setItem(pendingKey, '1'); } catch {}

  if (!deviceLink.device?.gatt?.connected || !deviceLink.rx) return;

  await deviceLink.rx.writeValue(new TextEncoder().encode('RESET\n'));
  await new Promise(resolve => setTimeout(resolve, 180));
  try { localStorage.removeItem(pendingKey); } catch {}
  deviceLink.device.gatt.disconnect();
}

async function syncBoardDisplay() {
  if (!deviceLink.device?.gatt?.connected || !deviceLink.rx) return;
  const profile = JSON.parse(localStorage.getItem('littleMeetProfile') || 'null');
  if (!profile) return;
  const intro = Array.from(String(profile.intro || '').replace(/[\r\n]/g, ' ')).slice(0, 30).join('');
  const aboutCommand = new TextEncoder().encode(`ABOUT:${intro}\n`);
  for (let offset = 0; offset < aboutCommand.length; offset += 20) {
    await deviceLink.rx.writeValue(aboutCommand.slice(offset, offset + 20));
  }
  if (profile.avatar?.type !== 'preset') {
    deviceLink.lastMessage = '기본 캐릭터 5종만 보드에 표시할 수 있어요.';
    updateDeviceUI();
    return;
  }
  const index = Number(profile.avatar.index);
  if (!Number.isInteger(index) || index < 0 || index > 4) return;
  const d = new Date();
  const hhmm = [d.getHours(), d.getMinutes()].map(n => String(n).padStart(2, '0')).join(':');
  const nick = String(profile.nick || '').replace(/[:\r\n]/g, '').slice(0, 10);
  const command = new TextEncoder().encode(`DISPLAY:${index}:${hhmm}:${nick}\n`);
  // Send in small pieces so UTF-8 nicknames fit the default BLE ATT MTU.
  for (let offset = 0; offset < command.length; offset += 20) {
    await deviceLink.rx.writeValue(command.slice(offset, offset + 20));
  }
}

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

  const realConnected =
    !!deviceLink.device?.gatt?.connected &&
    !!deviceLink.rx;

  if (status) {
    status.textContent = deviceLink.status;
  }

  if (message) {
    message.textContent = deviceLink.lastMessage;
  }

  if (button) {
    button.textContent = realConnected
      ? '기기 연결 해제'
      : '블루투스로 기기 연결하기';
  }

  // 실제 보드가 연결되면 등록 단계도 완료 처리
  if (state.page === 'connect' && realConnected) {
    state.connected = true;

    const card = document.querySelector(
      '.connectCard:not(#realBleCard)'
    );

    const heading = card?.querySelector('b');
    const detail = card?.querySelector('.muted');

    if (heading) {
      heading.textContent = '실제 NU40-DK 연결 완료!';
    }

    if (detail) {
      detail.textContent =
        '보드 연결 완료! 이제 닉네임을 설정해 줘.';
    }

    const next = document.querySelector('#connect');

    if (next) {
      next.textContent = '닉네임 정하러 가기 →';

      next.onclick = () => {
        state.page = 'nickname';
        render();
      };
    }

    const notice = document.querySelector('.notice');

    if (notice) {
      notice.textContent =
        '기기 연결이 완료됐어요! 다음 단계로 진행해 주세요.';
    }
  }
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
      acceptAllDevices: true, // Keep the all-device chooser the user already tested.
      optionalServices: [BLE_UART_SERVICE]
    });
    deviceLink.device = device;
    device.addEventListener('gattserverdisconnected', () => {
      clearInterval(displaySyncTimer);
      displaySyncTimer = null;
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
      uartReceiveBuffer += meetingDecoder.decode(bytes, { stream: true });
      let meetingAdded = false;
      let friendAdded = false;
      let friendProfileUpdated = false;
      let chunkedProfileUpdated = false;
      let newline;
      while ((newline = uartReceiveBuffer.indexOf('\n')) >= 0) {
        const line = uartReceiveBuffer.slice(0, newline).replace(/\r$/, '');
        uartReceiveBuffer = uartReceiveBuffer.slice(newline + 1);
        if (line.trim()) {
          deviceLink.lastMessage = line;
          meetingAdded = saveMeetingLine(line) || meetingAdded;
          friendAdded = saveFriendLine(line) || friendAdded;
          friendProfileUpdated = saveFriendProfileLine(line) || friendProfileUpdated;
          chunkedProfileUpdated = saveChunkedFriendProfileLine(line) || chunkedProfileUpdated;
        }
      }
      updateDeviceUI();
      if ((meetingAdded && state.page === 'home' && ['home', 'meet'].includes(state.tab)) ||
          ((friendAdded || friendProfileUpdated || chunkedProfileUpdated) && state.page === 'home' && ['home', 'friends'].includes(state.tab))) render();
    });
    deviceLink.status = `연결됨: ${device.name || 'NU40-DK'}`;
    deviceLink.lastMessage = '보드가 연결됐어요. 서로 화면을 공유하면 만남이 기록돼요.';
    updateDeviceUI();
    await deviceLink.rx.writeValue(new TextEncoder().encode('HELLO\n'));
    if (localStorage.getItem('littleMeetPendingBoardReset') === '1') {
      await deviceLink.rx.writeValue(new TextEncoder().encode('RESET\n'));
      await new Promise(resolve => setTimeout(resolve, 180));
      localStorage.removeItem('littleMeetPendingBoardReset');
    }
    await syncBoardDisplay();
    clearInterval(displaySyncTimer);
    displaySyncTimer = setInterval(() => syncBoardDisplay().catch(error => {
      deviceLink.lastMessage = `화면 전송 실패: ${error.message}`;
      updateDeviceUI();
    }), 15000);
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
