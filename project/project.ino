#include <DHT.h>
#include <string.h>

#define DHTPIN 2
#define DHTTYPE DHT11

#define SOIL_PIN A0
#define LDR_PIN A1
#define RAIN_PIN A2

#define SERVO_PIN 3
#define RELAY1_PIN 7
#define RELAY2_PIN 8

DHT dht(DHTPIN, DHTTYPE);

// Assumes the relay module is active LOW
bool pumpOn = false;
bool valveOn = false;

void setRelayState(bool pump, bool valve) {
  pumpOn = pump;
  valveOn = valve;
  digitalWrite(RELAY1_PIN, pumpOn ? LOW : HIGH);
  digitalWrite(RELAY2_PIN, valveOn ? LOW : HIGH);
}

void readSerialCommands() {
  static char command[16];
  static uint8_t commandLength = 0;

  while (Serial.available() > 0) {
    char incoming = Serial.read();

    if (incoming == '\r') {
      continue;
    }

    if (incoming == '\n') {
      command[commandLength] = '\0';

      if (strcmp(command, "RELAY_ON") == 0) {
        setRelayState(true, true);
      } else if (strcmp(command, "RELAY_OFF") == 0) {
        setRelayState(false, false);
      } else if (strcmp(command, "RELAY1_ON") == 0) {
        setRelayState(true, valveOn);
      } else if (strcmp(command, "RELAY1_OFF") == 0) {
        setRelayState(false, valveOn);
      } else if (strcmp(command, "RELAY2_ON") == 0) {
        setRelayState(pumpOn, true);
      } else if (strcmp(command, "RELAY2_OFF") == 0) {
        setRelayState(pumpOn, false);
      }

      commandLength = 0;
    } else if (commandLength < sizeof(command) - 1) {
      command[commandLength++] = incoming;
    } else {
      commandLength = 0;
    }
  }
}

void setup() {
  Serial.begin(9600);

  dht.begin();

  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);

  setRelayState(false, false);
  Serial.println("[BOOT] FARMACY sensor sketch started at 9600 baud");
  Serial.println("[BOOT] Waiting for DHT11 readings on digital pin 2");
}

void loop() {
  readSerialCommands();

  int soil = analogRead(SOIL_PIN);
  int light = analogRead(LDR_PIN);
  int rain = analogRead(RAIN_PIN);

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (!isnan(temperature) && !isnan(humidity)) {
    Serial.print("soil:");
    Serial.print(soil);
    Serial.print(",");
    Serial.print("  temp:");
    Serial.print(temperature);
    Serial.print(",");
    Serial.print("  Humidity:");
    Serial.print(humidity);
    Serial.print(",");
    Serial.print("  Light :");
    Serial.print(light);
    Serial.print(",");
    Serial.print("  Rain:");
    Serial.println(rain);
  } else {
    Serial.print("[DHT ERROR] No valid DHT11 reading; check power, GND, data wiring to D2. ");
    Serial.print("Analog diagnostics: soil=");
    Serial.print(soil);
    Serial.print(", light=");
    Serial.print(light);
    Serial.print(", rain=");
    Serial.println(rain);
  }

  delay(2000);
}