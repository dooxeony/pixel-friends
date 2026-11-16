#include <bluefruit.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"
#include <string.h>

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
  showWaiting();

  // Peripheral for web connection and central for board-to-board scan.
  Bluefruit.begin(1, 1);
  Bluefruit.setName(DEVICE_NAME);
  Bluefruit.setTxPower(0);
  bleuart.begin();

  Bluefruit.Scanner.setRxCallback(scan_callback);
  Bluefruit.Scanner.setInterval(160, 80);
  Bluefruit.Scanner.useActiveScan(true); // Name is in scan response.
  Bluefruit.Scanner.start(0);

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

  if (found != visible) {
    visible = found;
    if (visible) showFound();
    else showWaiting();
  }

  if (found && now - lastLedChange >= 300) {
    lastLedChange = now;
    greenOn = !greenOn;
    digitalWrite(LED_G, greenOn ? HIGH : LOW);
  } else if (!found) {
    digitalWrite(LED_G, LOW);
    greenOn = false;
  }

  // First-stage communication test: browser sends HELLO and board replies.
  if (bleuart.available()) {
    char input[32] = {0};
    int n = bleuart.read(input, sizeof(input) - 1);
    if (n > 0 && strstr(input, "HELLO")) {
      bleuart.println("NU40-DK READY");
      Serial.println("Web Bluetooth connected");
    }
  }
}
