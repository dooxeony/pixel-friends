#include <bluefruit.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"
#include <string.h>
#include <math.h>
#include "characters_new.h"

// Existing wiring, unchanged.
#define TFT_SCK  43
#define TFT_MOSI 44
#define TFT_DC   45
#define TFT_CS   46
#define TFT_RST  47
#define LED_R 14
#define LED_G 15
#define LED_B 16

Adafruit_GC9A01A tft(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCK, TFT_RST);
BLEUart bleuart; // Nordic UART Service: readable from the web using Web Bluetooth
const char DEVICE_NAME[] = "PIXEL_FRIEND";
const int MIN_RSSI = -70;
volatile uint32_t lastFriendSeen = 0;
volatile bool seenFriend = false;
bool visible = false;
bool greenOn = false;
uint32_t lastLedChange = 0;
int currentAvatar = -1;
char currentTime[6] = "--:--";
char command[48] = {0};
size_t commandLength = 0;
const uint32_t SCREEN_BG = 0xfff1f5; // soft pastel pink
const uint32_t FRAME_COLOR = 0xe997b3;
const uint32_t CLOCK_BG = 0xffffff;
const uint32_t CLOCK_TEXT = 0x503f48;

// The same 32x32 block-art rules and palettes as script.js.
uint16_t rgb(uint32_t hex) {
  return tft.color565((hex >> 16) & 255, (hex >> 8) & 255, hex & 255);
}
void block(int x, int y, int w, int h, uint16_t color) {
  // 32x32 pixels scaled to 160x160; centered at (40, 17).
  tft.fillRect(40 + x * 5, 17 + y * 5, w * 5, h * 5, color);
}
void drawAvatar(int i) {
  // New head-only pixel sprites. Keep the same 0..4 mapping used by the web.
  const uint16_t* art = newCharacterSprites[i];
  for (int y = 0; y < 80; ++y) {
    for (int x = 0; x < 80; ++x) {
      const uint16_t color = pgm_read_word(&art[y * 80 + x]);
      tft.fillRect(40 + x * 2, 17 + y * 2, 2, 2, color);
    }
  }
  return;
  const uint32_t baseHex[] = {0xfff9dd, 0xdcb58b, 0xf9d8c9, 0xa3d9a5, 0xffe58e};
  const uint32_t pinkHex[] = {0xf6bbcb, 0xf6d5b0, 0xef9cb1, 0xd5efae, 0xffb787};
  const uint32_t inkHex[]  = {0x503f48, 0x58443a, 0x654a52, 0x365d4e, 0x69533b};
  const uint32_t bgHex[]   = {0xcceef4, 0xf9e8d9, 0xfcecf2, 0xd8f0e5, 0xf9eac9};
  uint16_t base = rgb(baseHex[i]), pink = rgb(pinkHex[i]), ink = rgb(inkHex[i]);
  block(0, 0, 32, 32, rgb(bgHex[i]));
  if (i == 0) {
    block(8,2,5,12,ink); block(19,2,5,12,ink);
    block(9,3,3,10,base); block(20,3,3,10,base);
    block(10,5,1,6,pink); block(21,5,1,6,pink);
  } else if (i == 1) {
    block(5,7,8,9,ink); block(19,7,8,9,ink);
    block(7,9,5,6,base); block(20,9,5,6,base);
  } else if (i == 2) {
    block(5,4,10,13,ink); block(18,4,9,13,ink);
    block(7,6,7,9,base); block(20,6,5,9,base);
  } else if (i == 3) {
    block(6,6,8,8,ink); block(19,6,8,8,ink);
    block(8,7,5,5,rgb(0xffffff)); block(21,7,5,5,rgb(0xffffff));
  } else {
    block(13,2,6,8,pink); block(17,4,6,6,pink);
  }
  block(6,11,20,16,ink); block(4,15,24,11,ink);
  block(7,12,18,14,base); block(5,16,22,9,base);
  block(8,26,6,3,ink); block(18,26,6,3,ink);
  block(9,26,4,2,base); block(19,26,4,2,base);
  block(9,19,4,2,pink); block(20,19,4,2,pink);
  block(11,17,3,2,ink); block(19,17,3,2,ink);
  block(15,21,3,2,ink);
  if (i == 4) block(15,20,4,3,rgb(0xf2a05c));
  if (i == 3) { block(9,12,4,2,ink); block(20,12,4,2,ink); }
}
void maskAvatarIntoCircle() {
  // Hide square sprite corners using the surrounding screen color.
  // The 160x160 sprite is centered inside a 76-pixel-radius window.
  const int cx = 120, cy = 97, radius = 76;
  const uint16_t bg = rgb(SCREEN_BG);
  for (int x = 40; x < 200; ++x) {
    const int dx = x - cx;
    int span = abs(dx) <= radius
      ? (int)sqrtf((float)(radius * radius - dx * dx)) : -1;
    const int top = cy - span;
    const int bottom = cy + span;
    if (span < 0) {
      tft.drawFastVLine(x, 17, 160, bg);
    } else {
      if (top > 17) tft.drawFastVLine(x, 17, top - 17, bg);
      if (bottom < 176) tft.drawFastVLine(x, bottom + 1, 176 - bottom, bg);
    }
  }
  tft.drawCircle(cx, cy, 78, rgb(FRAME_COLOR));
  tft.drawCircle(cx, cy, 79, rgb(FRAME_COLOR));
}
void showClock() {
  // Completely redraw the rounded time badge when minutes change.
  tft.fillRoundRect(55, 185, 130, 42, 18, rgb(CLOCK_BG));
  tft.drawRoundRect(55, 185, 130, 42, 18, rgb(FRAME_COLOR));
  tft.setTextSize(3);
  tft.setTextColor(rgb(CLOCK_TEXT));
  tft.setCursor(75, 194);
  tft.print(currentTime);
}
void showMyDisplay() {
  tft.fillScreen(rgb(SCREEN_BG));
  if (currentAvatar >= 0 && currentAvatar <= 4) {
    drawAvatar(currentAvatar);
    maskAvatarIntoCircle();
  }
  showClock();
}
void handleCommand(const char* line) {
  if (strcmp(line, "HELLO") == 0) {
    bleuart.println("NU40-DK READY");
    Serial.println("Web Bluetooth connected");
  } else if (strncmp(line, "DISPLAY:", 8) == 0) {
    int i = -1, hh = -1, mm = -1;
    if (sscanf(line + 8, "%d:%d:%d", &i, &hh, &mm) == 3 &&
        i >= 0 && i <= 4 && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      bool avatarChanged = currentAvatar != i;
      char nextTime[6];
      snprintf(nextTime, sizeof(nextTime), "%02d:%02d", hh, mm);
      bool timeChanged = strcmp(currentTime, nextTime) != 0;
      currentAvatar = i;
      strcpy(currentTime, nextTime);
      if (avatarChanged) showMyDisplay();
      else if (timeChanged) showClock();
      bleuart.println("DISPLAY OK");
    }
  }
}

void showWaiting() {
  tft.fillScreen(GC9A01A_BLACK);
  tft.setTextColor(GC9A01A_WHITE);
  tft.setTextSize(2);
  tft.setCursor(53, 100);
  tft.print("Searching");
  tft.setCursor(105, 130);
  tft.print("...");
}

void showFound() {
  tft.fillScreen(GC9A01A_BLACK);
  uint16_t pink = tft.color565(255, 100, 170);
  tft.fillCircle(100, 80, 25, pink);
  tft.fillCircle(140, 80, 25, pink);
  tft.fillTriangle(77, 90, 163, 90, 120, 145, pink);
  tft.setTextColor(GC9A01A_WHITE);
  tft.setTextSize(3);
  tft.setCursor(48, 170);
  tft.print("FRIEND!");
}

void scan_callback(ble_gap_evt_adv_report_t* report) {
  uint8_t name[32] = {0};
  uint8_t len = Bluefruit.Scanner.parseReportByType(
    report, BLE_GAP_AD_TYPE_COMPLETE_LOCAL_NAME, name, sizeof(name) - 1);
  if (len &&
    (strcmp((char*)name, "PIXEL_FRIEND") == 0 ||
     strcmp((char*)name, "PIXEL") == 0) &&
    report->rssi >= MIN_RSSI) {
    lastFriendSeen = millis();
    seenFriend = true;
  }
  Bluefruit.Scanner.resume();
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);
  digitalWrite(LED_R, LOW);
  digitalWrite(LED_G, LOW);
  digitalWrite(LED_B, LOW);

  tft.begin();
  tft.fillScreen(GC9A01A_BLACK); // Shows the selected avatar after Web BLE sync.

  // First milestone: only the browser-to-board BLE link is active.
  // Board-to-board scanning can be re-enabled after avatar/time works.
  Bluefruit.begin(1, 0);
  Bluefruit.setName(DEVICE_NAME);
  Bluefruit.setTxPower(0);
  bleuart.begin();

  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addService(bleuart);
  Bluefruit.ScanResponse.addName();
  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(160, 160);
  Bluefruit.Advertising.start(0);
}

void loop() {
  uint32_t now = millis();
  bool found = seenFriend && (now - lastFriendSeen < 4000);

  // Friend detection only drives the LED; it must not replace the avatar/clock.
  visible = found;

  if (found && now - lastLedChange >= 300) {
    lastLedChange = now;
    greenOn = !greenOn;
    digitalWrite(LED_G, greenOn ? HIGH : LOW);
  } else if (!found) {
    digitalWrite(LED_G, LOW);
    greenOn = false;
  }

  // First-stage communication test: browser sends HELLO and board replies.
  while (bleuart.available()) {
    char ch = (char)bleuart.read();
    if (ch == '\n') {
      command[commandLength] = '\0';
      if (commandLength && command[commandLength - 1] == '\r') command[commandLength - 1] = '\0';
      handleCommand(command);
      commandLength = 0;
    } else if (commandLength < sizeof(command) - 1) {
      command[commandLength++] = ch;
    } else {
      commandLength = 0;
    }
  }
}
