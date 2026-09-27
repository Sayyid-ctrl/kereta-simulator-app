/**
 * ID-RailSim Physics Engine
 * Real-time train dynamics: Tractive force, air brake, gradient resistance, deadman safety system.
 */
class TrainPhysics {
  constructor() {
    this.speedKph = 0;
    this.speedMs = 0;
    this.distanceTraveledMeters = 0;

    // Controls
    this.notch = 0;          // 0 to 8
    this.reverser = 1;       // 1 = Forward, 0 = Neutral, -1 = Reverse
    this.brakePercent = 0;   // Ready to drive (0% = Released)
    this.emergencyBrake = false;

    // Rolling stock specs (Default CC 206)
    this.massTons = 480;      // Loco (90t) + 8 Coaches (390t)
    this.maxTractionKn = 350; // Responsive starting tractive effort
    this.maxPowerKw = 2200;   // 2,250 HP diesel engine output
    this.maxSpeedKph = 120;

    // Gradient in permille (‰)
    this.currentGradient = 0;

    // Deadman Safety System
    this.deadmanTimer = 35; // seconds
    this.deadmanMax = 35;
    this.deadmanWarning = false;

    // Score & Passenger Comfort
    this.driverScore = 1000;
    this.currentJerk = 0;
    this.lastAcceleration = 0;
  }

  setRollingStock(type) {
    if (type === 'jr205') {
      this.massTons = 300;
      this.maxTractionKn = 320;
      this.maxPowerKw = 2600;
      this.maxSpeedKph = 100;
    } else {
      this.massTons = 450;
      this.maxTractionKn = 350;
      this.maxPowerKw = 2200;
      this.maxSpeedKph = 120;
    }
    this.reset();
  }

  reset() {
    this.speedKph = 0;
    this.speedMs = 0;
    this.notch = 0;
    this.brakePercent = 0;
    this.emergencyBrake = false;
    this.deadmanTimer = this.deadmanMax;
    this.distanceTraveledMeters = 0;
  }

  stepThrottle(delta) {
    this.notch = Math.max(0, Math.min(8, this.notch + delta));
    if (this.notch > 0) {
      this.emergencyBrake = false;
      // Auto-release brake if throttle is applied
      if (this.brakePercent > 0) {
        this.brakePercent = 0;
        if (window.TrainAudio) window.TrainAudio.playAirBrakeHiss();
      }
    }
  }

  stepBrake(delta) {
    const oldBrake = this.brakePercent;
    this.brakePercent = Math.max(0, Math.min(100, this.brakePercent + delta * 20));
    if (this.brakePercent > 0 && this.notch > 0) {
      this.notch = Math.max(0, this.notch - 1); // Reduce throttle when braking
    }
    if (oldBrake > 10 && this.brakePercent < 10) {
      if (window.TrainAudio) window.TrainAudio.playAirBrakeHiss();
    }
  }

  toggleReverser() {
    if (Math.abs(this.speedKph) < 1) {
      this.reverser = (this.reverser === 1) ? -1 : 1;
    }
  }

  resetDeadman() {
    this.deadmanTimer = this.deadmanMax;
    this.deadmanWarning = false;
  }

  update(deltaTime) {
    if (deltaTime > 0.1) deltaTime = 0.1; // Clamp frame drops

    // 1. Deadman system calculation
    if (Math.abs(this.speedKph) > 5) {
      this.deadmanTimer -= deltaTime;
      if (this.deadmanTimer <= 5 && !this.deadmanWarning) {
        this.deadmanWarning = true;
        if (window.TrainAudio) window.TrainAudio.playDeadmanBuzzer();
      }
      if (this.deadmanTimer <= 0) {
        // Automatic Emergency Brake (EB)
        this.emergencyBrake = true;
        this.brakePercent = 100;
        this.notch = 0;
      }
    }

    // 2. Tractive Effort (Notch 0 - 8)
    let tractiveForceN = 0;
    if (this.notch > 0 && !this.emergencyBrake) {
      const notchRatio = this.notch / 8.0;
      const targetKn = this.maxTractionKn * notchRatio;

      if (Math.abs(this.speedMs) > 2.0) {
        const powerLimitedKn = (this.maxPowerKw * notchRatio) / Math.abs(this.speedMs);
        tractiveForceN = Math.min(targetKn, powerLimitedKn) * 1000 * this.reverser;
      } else {
        tractiveForceN = targetKn * 1000 * this.reverser;
      }
    }

    // 3. Train Resistances (Davis Formula for 1067mm gauge)
    const massKg = this.massTons * 1000;
    const absSpeedMs = Math.abs(this.speedMs);
    const absSpeedKph = Math.abs(this.speedKph);

    // Roll + Track + Air drag resistance
    const rRolling = (1.5 + 0.001 * massKg / 1000) * 9.81 * (massKg / 1000);
    const rAir = 0.0035 * Math.pow(absSpeedKph, 2) * 100;
    const rGradient = (this.currentGradient / 1000) * massKg * 9.81;

    let totalResistanceN = (rRolling + rAir) * Math.sign(this.speedMs) + rGradient;

    // 4. Braking Force
    let brakeForceN = 0;
    if (this.brakePercent > 0 || this.emergencyBrake) {
      const brakeCoeff = (this.emergencyBrake) ? 1.3 : (this.brakePercent / 100.0);
      // Modern Dual-Pipe Air Brake ~ 1.0 m/s^2 deceleration rate
      brakeForceN = massKg * 1.0 * brakeCoeff * Math.sign(this.speedMs);
    }

    // 5. Net Force and Acceleration (F = m * a)
    const netForceN = tractiveForceN - totalResistanceN - brakeForceN;
    const acceleration = netForceN / massKg;

    // Jerk calculation for passenger comfort
    this.currentJerk = Math.abs((acceleration - this.lastAcceleration) / deltaTime);
    this.lastAcceleration = acceleration;

    // 6. Integrate Speed & Position
    this.speedMs += acceleration * deltaTime;

    // Stop threshold to avoid jitter
    if (Math.abs(this.speedMs) < 0.05 && this.brakePercent > 30) {
      this.speedMs = 0;
    }

    this.speedKph = this.speedMs * 3.6;
    if (Math.abs(this.speedKph) > this.maxSpeedKph) {
      this.speedKph = Math.sign(this.speedKph) * this.maxSpeedKph;
      this.speedMs = this.speedKph / 3.6;
    }

    const distanceDelta = this.speedMs * deltaTime;
    this.distanceTraveledMeters += distanceDelta;

    // 7. Track audio feedback
    if (window.TrainAudio) {
      window.TrainAudio.updateEngine(this.notch, Math.abs(this.speedKph));
      if (Math.abs(this.distanceTraveledMeters - window.TrainAudio.lastClackDist) > 25) {
        window.TrainAudio.playTrackClack(Math.abs(this.speedKph));
        window.TrainAudio.lastClackDist = this.distanceTraveledMeters;
      }
    }
  }
}

window.TrainPhysics = new TrainPhysics();
