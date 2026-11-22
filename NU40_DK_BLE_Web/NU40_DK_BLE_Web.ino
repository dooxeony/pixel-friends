#include <bluefruit.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"
#include <string.h>
#include <math.h>
#include <stdio.h>
#include "characters_new.h"

// ========================================
// 1. 보드 선택
// 네 보드: 1 / 친구 보드: 2
// ========================================
#define MY_BOARD_ID 1

#if MY_BOARD_ID == 1

  #define TFT_SCK  43
  #define TFT_MOSI 44
  #define TFT_DC   45
  #define TFT_CS   46
  #define TFT_RST  47

  #define LED_R 14
  #define LED_G 15
  #define LED_B 26
  #define BUTTON_PIN 24

#else

  #define TFT_SCK  19
  #define TFT_MOSI 20
  #define TFT_DC   21
  #define TFT_CS   22
  #define TFT_RST  23

  #define LED_R 11
  #define LED_G 12

  // 친구 보드의 LED_B 24는
  // BUTTON_PIN 24와 충돌하므로 사용 안 함
  #define LED_B -1
  #define BUTTON_PIN 24

#endif

// ========================================
// 2. 객체 및 BLE 설정
// ========================================
Adafruit_GC9A01A tft(
  TFT_CS, TFT_DC, TFT_MOSI,
  TFT_SCK, TFT_RST
);

BLEUart bleuart;

const char* DEVICE_NAME =
  MY_BOARD_ID == 1
  ? "PIXEL_FRIEND_01"
  : "PIXEL_FRIEND_02";

const int RSSI_THRESHOLD = -70;

const uint32_t DETECT_TIMEOUT = 4000;
const uint32_t DISPLAY_TIME = 30000;
const uint32_t SIGNAL_TIME = 15000;
const uint32_t SUCCESS_TIME = 3000;

volatile uint8_t webConnections = 0;

// ========================================
// 3. 내 캐릭터 정보
// ========================================
int currentAvatar = -1;
char currentTime[6] = "--:--";

// ========================================
// 4. 상대방 정보
// ========================================
volatile uint32_t lastFriendSeen = 0;
volatile bool seenFriend = false;

volatile uint8_t peerId = 0;
volatile uint8_t peerAvatar = 255;
volatile uint8_t peerHour = 255;
volatile uint8_t peerMinute = 255;

volatile uint8_t peerSignal = 0;
volatile uint8_t peerTarget = 0;

// ========================================
// 5. 친구 신청 정보
// 0 = 없음
// 1 = 신청
// 2 = 수락
// 3 = 거절
// ========================================
uint8_t mySignal = 0;
uint8_t myTarget = 0;

uint32_t signalUntil = 0;

bool incomingRequest = false;
bool awaitingAnswer = false;
bool friendsAdded = false;

// 거절한 요청이 다시 나타나는 것 방지
bool ignoredRequest = false;

// ========================================
// 6. 화면 상태
// ========================================
bool wasFound = false;
bool discoveryShown = false;

uint32_t peerDisplayUntil = 0;
uint32_t successUntil = 0;

// -1 = 초기 상태
//  0 = 내 캐릭터
//  1 = 상대 캐릭터
//  2 = 신청 대기
//  3 = 신청 수신
//  4 = 친구 추가 성공
int displayedState = -1;

// ========================================
// 7. 버튼 상태
// ========================================
bool buttonWasDown = false;
uint32_t lastButtonEdge = 0;
uint32_t lastButtonRelease = 0;
uint8_t clickCount = 0;

// ========================================
// 8. LED 상태
// ========================================
bool ledState = false;
uint32_t lastLedChange = 0;

// ========================================
// 9. 웹 UART 명령
// ========================================
char command[48] = {0};
size_t commandLength = 0;

// ========================================
// 10. 색상
// ========================================
const uint32_t SCREEN_BG = 0xfff1f5;
const uint32_t FRAME_COLOR = 0xe997b3;
const uint32_t CLOCK_BG = 0xffffff;
const uint32_t CLOCK_TEXT = 0x503f48;

uint16_t rgb(uint32_t hex) {
  return tft.color565(
    (hex >> 16) & 255,
    (hex >> 8) & 255,
    hex & 255
  );
}

// ========================================
// 11. LED 제어
// ========================================
void ledOff() {
  digitalWrite(LED_R, LOW);
  digitalWrite(LED_G, LOW);

#if LED_B >= 0
  digitalWrite(LED_B, LOW);
#endif
}

void ledAlert(bool on) {
  // 친구 보드는 초록 LED 사용
  // 네 보드는 파랑 LED 사용
#if LED_B >= 0
  digitalWrite(LED_B, on ? HIGH : LOW);
#else
  digitalWrite(LED_G, on ? HIGH : LOW);
#endif
}

// ========================================
// 12. 캐릭터 그리기
// ========================================
void drawAvatar(int index) {

  if (index < 0 || index > 4) return;

  const uint16_t* art =
    newCharacterSprites[index];

  for (int y = 0; y < 80; y++) {

    for (int x = 0; x < 80; x++) {

      uint16_t color =
        pgm_read_word(
          &art[y * 80 + x]
        );

      tft.fillRect(
        40 + x * 2,
        17 + y * 2,
        2, 2,
        color
      );
    }
  }
}

// ========================================
// 13. 원형 캐릭터 마스킹
// ========================================
void maskAvatarIntoCircle() {

  const int cx = 120;
  const int cy = 97;
  const int radius = 76;

  uint16_t bg = rgb(SCREEN_BG);

  for (int x = 40; x < 200; x++) {

    int dx = x - cx;

    int span =
      abs(dx) <= radius
      ? (int)sqrtf(
          (float)(radius * radius - dx * dx)
        )
      : -1;

    if (span < 0) {

      tft.drawFastVLine(
        x, 17, 160, bg
      );

    } else {

      int top = cy - span;
      int bottom = cy + span;

      if (top > 17) {
        tft.drawFastVLine(
          x, 17, top - 17, bg
        );
      }

      if (bottom < 176) {
        tft.drawFastVLine(
          x, bottom + 1,
          176 - bottom, bg
        );
      }
    }
  }

  tft.drawCircle(
    cx, cy, 78, rgb(FRAME_COLOR)
  );

  tft.drawCircle(
    cx, cy, 79, rgb(FRAME_COLOR)
  );
}

// ========================================
// 14. 시간 표시
// ========================================
void drawTime(const char* timeText) {

  tft.fillRoundRect(
    55, 185, 130, 42, 18,
    rgb(CLOCK_BG)
  );

  tft.drawRoundRect(
    55, 185, 130, 42, 18,
    rgb(FRAME_COLOR)
  );

  tft.setTextSize(3);
  tft.setTextColor(rgb(CLOCK_TEXT));

  tft.setCursor(75, 194);
  tft.print(timeText);
}

// ========================================
// 15. 내 캐릭터 화면
// ========================================
void showMyDisplay() {

  tft.fillScreen(rgb(SCREEN_BG));

  if (currentAvatar >= 0 &&
      currentAvatar <= 4) {

    drawAvatar(currentAvatar);
    maskAvatarIntoCircle();

  } else {

    tft.setTextSize(2);
    tft.setTextColor(rgb(CLOCK_TEXT));

    tft.setCursor(45, 100);
    tft.print("PIXEL FRIEND");
  }

  drawTime(currentTime);
}

// ========================================
// 16. 상대방 발견 화면
// ========================================
void showPeerDisplay() {

  uint8_t avatar = peerAvatar;
  uint8_t hour = peerHour;
  uint8_t minute = peerMinute;

  tft.fillScreen(rgb(SCREEN_BG));

  if (avatar <= 4) {

    drawAvatar(avatar);
    maskAvatarIntoCircle();

  } else {

    uint16_t pink =
      tft.color565(255, 100, 170);

    tft.fillCircle(100, 80, 25, pink);
    tft.fillCircle(140, 80, 25, pink);

    tft.fillTriangle(
      77, 90,
      163, 90,
      120, 145,
      pink
    );
  }

  char timeText[6] = "--:--";

  if (hour <= 23 && minute <= 59) {

    snprintf(
      timeText,
      sizeof(timeText),
      "%02u:%02u",
      (unsigned)hour,
      (unsigned)minute
    );
  }

  drawTime(timeText);
}

// ========================================
// 17. 친구 상태 화면
// ========================================
void showFriendScreen(const char* title) {

  uint8_t avatar = peerAvatar;

  tft.fillScreen(rgb(SCREEN_BG));

  if (avatar <= 4) {

    drawAvatar(avatar);
    maskAvatarIntoCircle();

  } else {

    tft.fillCircle(
      120, 95, 54,
      rgb(FRAME_COLOR)
    );
  }

  tft.setTextColor(rgb(CLOCK_TEXT));
  tft.setTextSize(2);
  tft.setCursor(20, 194);
  tft.print(title);
}

// ========================================
// 18. BLE 광고 설정
// ========================================

// 광고 데이터 형식:
// [0] 회사 ID 0xFF
// [1] 회사 ID 0xFF
// [2] 보드 ID
// [3] 캐릭터 ID
// [4] 시
// [5] 분
// [6] 신호 + 대상 보드 ID

void refreshAdvert() {

  uint8_t hour = 255;
  uint8_t minute = 255;

  if (strlen(currentTime) == 5 &&
      currentTime[2] == ':') {

    hour =
      (currentTime[0] - '0') * 10 +
      (currentTime[1] - '0');

    minute =
      (currentTime[3] - '0') * 10 +
      (currentTime[4] - '0');
  }

  uint8_t packedSignal =
    (mySignal & 0x03) |
    ((myTarget & 0x03) << 2);

  uint8_t data[7] = {
    0xFF, 0xFF,
    MY_BOARD_ID,
    currentAvatar >= 0
      ? (uint8_t)currentAvatar
      : (uint8_t)255,
    hour,
    minute,
    packedSignal
  };

  Bluefruit.Advertising.stop();

  Bluefruit.Advertising.clearData();
  Bluefruit.ScanResponse.clearData();

  bool flagsOK =
    Bluefruit.Advertising.addFlags(
      BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE
    );

  bool uartOK =
    Bluefruit.Advertising.addService(bleuart);

  bool dataOK =
    Bluefruit.Advertising.addManufacturerData(
      data, sizeof(data)
    );

  bool nameOK =
    Bluefruit.ScanResponse.addName();

  if (!flagsOK || !uartOK ||
      !dataOK || !nameOK) {

    Serial.println(
      "ERROR: BLE advertising data"
    );

    return;
  }

  // 웹에 1개 연결되어도
  // 남은 Peripheral 슬롯에서 광고 유지
  if (webConnections < 2) {

    if (!Bluefruit.Advertising.start(0)) {

      Serial.println(
        "ERROR: advertising start"
      );
    }
  }
}

// ========================================
// 19. 친구 신호 전송
// ========================================
void publishSignal(
  uint8_t signal,
  uint8_t target
) {

  mySignal = signal;
  myTarget = target;

  signalUntil = millis() + SIGNAL_TIME;

  refreshAdvert();
}

// ========================================
// 20. BLE 연결 콜백
// ========================================
void connect_callback(
  uint16_t conn_handle
) {

  if (webConnections < 2) {
    webConnections++;
  }

  Serial.println("BLE CONNECTED");

  // 웹 연결 뒤에도 광고 재개
  if (webConnections < 2) {

    if (!Bluefruit.Advertising.isRunning()) {

      Bluefruit.Advertising.start(0);
    }
  }
}

void disconnect_callback(
  uint16_t conn_handle,
  uint8_t reason
) {

  if (webConnections > 0) {
    webConnections--;
  }

  Serial.println("BLE DISCONNECTED");

  // 연결이 끊어지면 다시 광고
  if (webConnections < 2 &&
      !Bluefruit.Advertising.isRunning()) {

    Bluefruit.Advertising.start(0);
  }
}

// ========================================
// 21. 상대 보드 스캔
// ========================================
void scan_callback(
  ble_gap_evt_adv_report_t* report
) {

  uint8_t data[24] = {0};

  uint8_t len =
    Bluefruit.Scanner.parseReportByType(
      report,
      BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA,
      data,
      sizeof(data)
    );

  // 양쪽 모두 동일한 7바이트 형식
  if (len == 7 &&
      data[0] == 0xFF &&
      data[1] == 0xFF &&
      data[2] >= 1 &&
      data[2] <= 2 &&
      data[2] != MY_BOARD_ID &&
      report->rssi >= RSSI_THRESHOLD) {

    lastFriendSeen = millis();
    seenFriend = true;

    peerId = data[2];
    peerAvatar = data[3];
    peerHour = data[4];
    peerMinute = data[5];

    peerSignal = data[6] & 0x03;
    peerTarget = (data[6] >> 2) & 0x03;
  }

  Bluefruit.Scanner.resume();
}

// ========================================
// 22. 웹사이트 명령어 처리
// ========================================
void handleCommand(const char* line) {

  if (strcmp(line, "HELLO") == 0) {

    bleuart.println("NU40-DK READY");
    Serial.println("Web Bluetooth ready");

  } else if (
    strncmp(line, "DISPLAY:", 8) == 0
  ) {

    int avatar = -1;
    int hh = -1;
    int mm = -1;

    int result = sscanf(
      line + 8,
      "%d:%d:%d",
      &avatar,
      &hh,
      &mm
    );

    if (result == 3 &&
        avatar >= 0 &&
        avatar <= 4 &&
        hh >= 0 &&
        hh <= 23 &&
        mm >= 0 &&
        mm <= 59) {

      bool avatarChanged =
        currentAvatar != avatar;

      char newTime[6];

      snprintf(
        newTime,
        sizeof(newTime),
        "%02d:%02d",
        hh, mm
      );

      bool timeChanged =
        strcmp(currentTime, newTime) != 0;

      currentAvatar = avatar;
      strcpy(currentTime, newTime);

      if (avatarChanged || timeChanged) {
        refreshAdvert();
      }

      if (displayedState == 0 ||
          displayedState == -1) {

        if (avatarChanged) {
          showMyDisplay();
        } else if (timeChanged) {
          drawTime(currentTime);
        }
      }

      bleuart.println("DISPLAY OK");

    } else {

      bleuart.println("DISPLAY ERROR");
    }
  }
}

// ========================================
// 23. SETUP
// ========================================
void setup() {

  Serial.begin(115200);

  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);

#if LED_B >= 0
  pinMode(LED_B, OUTPUT);
#endif

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  ledOff();

  // 디스플레이
  tft.begin();
  showMyDisplay();

  // BLE 초기화
  // Peripheral 2개 / Central 1개
  Bluefruit.begin(2, 1);

  Bluefruit.setName(DEVICE_NAME);
  Bluefruit.setTxPower(0);

  bleuart.begin();

  // BLE 연결 콜백
  Bluefruit.Periph.setConnectCallback(
    connect_callback
  );

  Bluefruit.Periph.setDisconnectCallback(
    disconnect_callback
  );

  // 광고 설정
  Bluefruit.Advertising.restartOnDisconnect(
    true
  );

  Bluefruit.Advertising.setInterval(
    160, 160
  );

  refreshAdvert();

  // 상대 보드 검색
  Bluefruit.Scanner.setRxCallback(
    scan_callback
  );

  Bluefruit.Scanner.setInterval(
    160, 80
  );

  // 제조사 데이터가 기본 광고에 존재
  Bluefruit.Scanner.useActiveScan(false);

  if (!Bluefruit.Scanner.start(0)) {
    Serial.println("ERROR: scanner start");
  }

  Serial.print("BOARD ID: ");
  Serial.println(MY_BOARD_ID);

  Serial.println("PIXEL FRIEND STARTED");
}

// ========================================
// 24. LOOP
// ========================================
void loop() {

  uint32_t now = millis();

  // ------------------------------------
  // 1. 친구 감지
  // ------------------------------------
  bool found =
    seenFriend &&
    (now - lastFriendSeen < DETECT_TIMEOUT);

  if (found && !wasFound) {

    discoveryShown = true;
    peerDisplayUntil = now + DISPLAY_TIME;

    ignoredRequest = false;

    displayedState = -1;

    Serial.println("FRIEND DETECTED!");
  }

  if (!found && wasFound) {

    Serial.println("FRIEND LOST!");
    discoveryShown = false;
  }

  wasFound = found;

  // ------------------------------------
  // 2. 신호 만료
  // ------------------------------------
  if (mySignal != 0 &&
      (int32_t)(now - signalUntil) >= 0) {

    mySignal = 0;
    myTarget = 0;

    refreshAdvert();
  }

  // ------------------------------------
  // 3. 버튼 입력
  // ------------------------------------
  bool buttonDown =
    digitalRead(BUTTON_PIN) == LOW;

  if (buttonDown != buttonWasDown &&
      now - lastButtonEdge >= 35) {

    lastButtonEdge = now;
    buttonWasDown = buttonDown;

    if (!buttonDown) {

      clickCount++;
      lastButtonRelease = now;
    }
  }

  if (clickCount > 0 &&
      now - lastButtonRelease > 450) {

    uint8_t clicks = clickCount;
    clickCount = 0;

    // 기존 코드의 버튼 규칙 유지:
    // 1번 = 친구 신청
    if (clicks == 1 &&
        found &&
        !incomingRequest &&
        !awaitingAnswer &&
        !friendsAdded) {

      awaitingAnswer = true;

      publishSignal(1, peerId);

      Serial.println("REQUEST SENT");
    }

    // 2번 = 친구 신청 수락
    else if (clicks == 2 &&
             incomingRequest) {

      friendsAdded = true;
      incomingRequest = false;

      successUntil = now + SUCCESS_TIME;

      publishSignal(2, peerId);

      Serial.println("FRIEND ACCEPTED");
    }

    // 3번 = 친구 신청 거절
    else if (clicks >= 3 &&
             incomingRequest) {

      incomingRequest = false;
      ignoredRequest = true;

      publishSignal(3, peerId);

      Serial.println("FRIEND REJECTED");
    }
  }

  // ------------------------------------
  // 4. 상대방 요청 수신
  // ------------------------------------
  if (found &&
      peerTarget == MY_BOARD_ID) {

    if (peerSignal == 1 &&
        !friendsAdded &&
        !awaitingAnswer &&
        !ignoredRequest) {

      incomingRequest = true;
    }

    if (peerSignal == 2 &&
        awaitingAnswer) {

      awaitingAnswer = false;
      friendsAdded = true;

      successUntil = now + SUCCESS_TIME;

      Serial.println("WE ARE FRIENDS!");
    }

    if (peerSignal == 3 &&
        awaitingAnswer) {

      awaitingAnswer = false;

      Serial.println("REQUEST REJECTED");
    }
  }

  // 거리가 멀어지면 요청 대기 정리
  if (!found) {
    incomingRequest = false;

    if (!friendsAdded) {
      awaitingAnswer = false;
    }
  }

  // ------------------------------------
  // 5. 화면 상태 결정
  // ------------------------------------
  int screenState = 0;

  if (friendsAdded &&
      (int32_t)(now - successUntil) < 0) {

    screenState = 4;

  } else if (incomingRequest) {

    screenState = 3;

  } else if (awaitingAnswer) {

    screenState = 2;

  } else if (found &&
             discoveryShown &&
             (int32_t)(now - peerDisplayUntil) < 0) {

    screenState = 1;

  } else {

    screenState = 0;
  }

  // ------------------------------------
  // 6. 화면 변경
  // ------------------------------------
  if (screenState != displayedState) {

    displayedState = screenState;

    if (screenState == 4) {

      showFriendScreen("FRIENDS!");

    } else if (screenState == 3) {

      showFriendScreen("2:YES 3:NO");

    } else if (screenState == 2) {

      showFriendScreen("WAITING...");

    } else if (screenState == 1) {

      showPeerDisplay();

    } else {

      showMyDisplay();
    }
  }

  // ------------------------------------
  // 7. 발견 알림 LED
  // 최초 5초 점멸
  // ------------------------------------
  bool alertActive =
    found &&
    discoveryShown &&
    (int32_t)(
      now - (peerDisplayUntil - DISPLAY_TIME + 5000)
    ) < 0;

  if (alertActive) {

    if (now - lastLedChange >= 300) {

      lastLedChange = now;
      ledState = !ledState;

      ledAlert(ledState);
    }

  } else {

    ledState = false;
    ledOff();
  }

  // ------------------------------------
  // 8. 웹사이트 UART 수신
  // ------------------------------------
  while (bleuart.available()) {

    char ch = (char)bleuart.read();

    if (ch == '\n') {

      command[commandLength] = '\0';

      if (commandLength > 0 &&
          command[commandLength - 1] == '\r') {

        command[commandLength - 1] = '\0';
      }

      handleCommand(command);
      commandLength = 0;

    } else if (
      commandLength < sizeof(command) - 1
    ) {

      command[commandLength++] = ch;

    } else {

      commandLength = 0;
    }
  }
}

