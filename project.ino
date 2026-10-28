#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

#define SOIL_PIN A0
#define LDR_PIN A1
#define RAIN_PIN A2

#define SERVO_PIN 3
#define RELAY1_PIN 7
#define RELAY2_PIN 8

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);

  dht.begin();

  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);

  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);

  // CSV header
  Serial.println("soil_moisture,temperature,humidity,light,rain");
}

void loop() {

  int soil = analogRead(SOIL_PIN);
  int light = analogRead(LDR_PIN);
  int rain = analogRead(RAIN_PIN);

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Avoid sending invalid DHT readings
  if (isnan(temperature) || isnan(humidity)) {
    return;
  }

  // Send CSV data
  Serial.print(soil);
  Serial.print(",");

  Serial.print(temperature);
  Serial.print(",");

  Serial.print(humidity);
  Serial.print(",");

  Serial.print(light);
  Serial.print(",");

  Serial.println(rain);

  delay(1000);
}