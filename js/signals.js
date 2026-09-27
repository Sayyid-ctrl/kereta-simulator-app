/**
 * ID-RailSim KAI Semboyan Signaling & JPL System
 */
class SignalSystem {
  constructor() {
    this.signals = [
      { id: "SIG-01", positionZ: 300, state: "SEMBOYAN_5", name: "Sinyal Masuk Manggarai" },
      { id: "SIG-02", positionZ: 1200, state: "SEMBOYAN_6", name: "Sinyal Blok 12+400" },
      { id: "SIG-03", positionZ: 2400, state: "SEMBOYAN_5", name: "Sinyal Keluar Jatinegara" },
      { id: "SIG-04", positionZ: 4000, state: "SEMBOYAN_7", name: "Sinyal Blok Cipinang" }
    ];

    this.levelCrossings = [
      { id: "JPL-11", positionZ: 650, name: "JPL 11 Pisangan", barrierClosed: false, isWarning: false },
      { id: "JPL-14", positionZ: 2100, name: "JPL 14 Matraman", barrierClosed: false, isWarning: false }
    ];

    this.currentAspect = "SEMBOYAN_5";
    this.taspat = 90; // Batas kecepatan lintas km/h
  }

  update(currentZ) {
    // Check signals ahead
    const nextSignal = this.signals.find(s => s.positionZ > currentZ);
    if (nextSignal) {
      const dist = nextSignal.positionZ - currentZ;
      if (dist < 400 && nextSignal.state === "SEMBOYAN_7") {
        this.currentAspect = "SEMBOYAN_7";
      } else if (dist < 500 && nextSignal.state === "SEMBOYAN_6") {
        this.currentAspect = "SEMBOYAN_6";
      } else {
        this.currentAspect = nextSignal.state;
      }
    } else {
      this.currentAspect = "SEMBOYAN_5";
    }

    // Check JPL crossings
    this.levelCrossings.forEach(jpl => {
      const dist = Math.abs(jpl.positionZ - currentZ);
      if (dist < 350) {
        jpl.barrierClosed = true;
        jpl.isWarning = true;
      } else {
        jpl.barrierClosed = false;
        jpl.isWarning = false;
      }
    });

    return {
      aspect: this.currentAspect,
      taspat: this.taspat,
      nextSignal: nextSignal
    };
  }
}

window.SignalSystem = new SignalSystem();
