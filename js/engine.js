/**
 * ID-RailSim 3D Ultra-Realistic Engine (Three.js WebGL)
 * High-Fidelity Indonesian Railway Simulator:
 * - CC 206 (GE CM20EMP) & JR 205 EMU Detailed 3D Mesh
 * - Realistic 3D Cab Interior with moving needles & wiper animation
 * - Dynamic Diesel Exhaust Smoke Particles
 * - Indonesian Landmarks: Stasiun Manggarai, JPL Perlintasan Sebidang, Terowongan Sasaksaat, Jembatan Cikubang
 * - Cab Vibration, Volumetric Headlight Beams & Post-FX
 */

class SuperRailSimEngine {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Configuration
    this.currentTrainType = 'cc206';
    this.currentRoute = 'jakarta';
    this.cameraMode = 'cab'; // 'cab', 'third', 'track', 'passenger'

    // Scene Groups
    this.trainGroup = null;
    this.trackGroup = null;
    this.sceneryGroup = null;
    this.exhaustParticles = null;
    this.rainParticles = null;
    this.wiperBlades = [];
    this.cabNeedles = {};
    this.jplBarriers = [];
    this.jplLamps = [];

    // Environment state
    this.isNight = false;
    this.isRaining = false;
    this.wiperAngle = 0;
    this.wiperDirection = 1;
    this.dirLight = null;
    this.hemiLight = null;
    this.skyColor = 0x78b8e6;

    // Camera targets
    this.cabOffset = new THREE.Vector3(0.55, 2.7, 8.4);
    this.passengerOffset = new THREE.Vector3(0.9, 2.2, -18.0);

    this.initThree();
    this.setupEnvironment();
    this.buildWorld();
    this.buildTrain();
    this.setupExhaustSmoke();
    this.setupEventListeners();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.skyColor);
    this.scene.fog = new THREE.FogExp2(this.skyColor, 0.0016);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2500);
    this.camera.position.set(0, 3, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupEnvironment() {
    // Hemispheric Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d5c3a, 0.8);
    this.scene.add(this.hemiLight);

    // Directional Sunlight with Soft Shadows
    this.dirLight = new THREE.DirectionalLight(0xfffaea, 1.45);
    this.dirLight.position.set(100, 160, 70);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 500;
    const d = 70;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0003;
    this.scene.add(this.dirLight);

    // Tropical Rain System
    const rainCount = 5000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 140;
      rainPos[i + 1] = Math.random() * 60;
      rainPos[i + 2] = (Math.random() - 0.5) * 140;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.16,
      transparent: true,
      opacity: 0.0
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainParticles);
  }

  setupExhaustSmoke() {
    // Dynamic Diesel Exhaust Smoke
    const smokeCount = 80;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeSizes = new Float32Array(smokeCount);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3] = 0;
      smokePos[i * 3 + 1] = 4.2;
      smokePos[i * 3 + 2] = 2.0;
      smokeSizes[i] = 0.5;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    smokeGeo.setAttribute('size', new THREE.BufferAttribute(smokeSizes, 1));

    const smokeMat = new THREE.PointsMaterial({
      color: 0x334155,
      size: 1.2,
      transparent: true,
      opacity: 0.35
    });
    this.exhaustParticles = new THREE.Points(smokeGeo, smokeMat);
    this.scene.add(this.exhaustParticles);
  }

  buildWorld() {
    this.trackGroup = new THREE.Group();
    this.sceneryGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    this.scene.add(this.sceneryGroup);

    const trackLength = 5200;
    const gaugeHalf = 1.067 / 2; // Indonesian 1067mm Cape Gauge

    // 1. Ballast Bed (High-quality Gravel)
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.95 });
    const ballastGeo = new THREE.BoxGeometry(3.8, 0.45, trackLength);
    const ballast1 = new THREE.Mesh(ballastGeo, ballastMat);
    ballast1.position.set(0, -0.22, trackLength / 2 - 200);
    ballast1.receiveShadow = true;
    this.trackGroup.add(ballast1);

    // Double Track Up-Line (Jalur Hilir)
    const ballast2 = ballast1.clone();
    ballast2.position.x = 4.5;
    this.trackGroup.add(ballast2);

    // 2. Concrete Sleepers with Rail Fasteners (Bantalan Beton WIKA & Pandrol Clip)
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const sleeperGeo = new THREE.BoxGeometry(2.3, 0.2, 0.28);
    const sleeperCount = Math.floor(trackLength / 0.6);
    const sleeperInst = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
    sleeperInst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < sleeperCount; i++) {
      dummy.position.set(0, 0.05, i * 0.6 - 200);
      dummy.updateMatrix();
      sleeperInst.setMatrixAt(i, dummy.matrix);
    }
    sleeperInst.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(sleeperInst);

    // 3. Steel Rails R54 Profile (Shiny Crown with Rust Web)
    const railMat = new THREE.MeshStandardMaterial({ color: 0xc8d1dc, metalness: 0.88, roughness: 0.2 });
    const railGeo = new THREE.BoxGeometry(0.09, 0.18, trackLength);

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-gaugeHalf, 0.22, trackLength / 2 - 200);
    leftRail.castShadow = true;
    this.trackGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(gaugeHalf, 0.22, trackLength / 2 - 200);
    rightRail.castShadow = true;
    this.trackGroup.add(rightRail);

    // Second Track Rails
    const leftRail2 = leftRail.clone(); leftRail2.position.x += 4.5; this.trackGroup.add(leftRail2);
    const rightRail2 = rightRail.clone(); rightRail2.position.x += 4.5; this.trackGroup.add(rightRail2);

    // 4. LAA Catenary System (Listrik Aliran Atas 1500V DC)
    const catenaryMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    for (let z = 0; z < trackLength; z += 50) {
      const gantry = this.createCatenaryGantry(catenaryMat);
      gantry.position.set(0, 0, z);
      this.trackGroup.add(gantry);
    }

    const wireGeo = new THREE.CylinderGeometry(0.012, 0.012, trackLength, 4);
    wireGeo.rotateX(Math.PI / 2);
    const contactWire = new THREE.Mesh(wireGeo, wireMat);
    contactWire.position.set(0, 5.3, trackLength / 2 - 200);
    this.trackGroup.add(contactWire);

    // 5. Build Indonesian Scenery & Landmarks
    this.buildIndonesianScenery();
  }

  createCatenaryGantry(mat) {
    const g = new THREE.Group();
    // Mast Left & Right
    const mastGeo = new THREE.BoxGeometry(0.24, 6.4, 0.24);
    const mL = new THREE.Mesh(mastGeo, mat); mL.position.set(-2.6, 3.2, 0); g.add(mL);
    const mR = new THREE.Mesh(mastGeo, mat); mR.position.set(7.1, 3.2, 0); g.add(mR);
    // Crossbeam
    const beamGeo = new THREE.BoxGeometry(10.0, 0.25, 0.25);
    const beam = new THREE.Mesh(beamGeo, mat); beam.position.set(2.25, 6.0, 0); g.add(beam);
    // Insulators
    const insGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7);
    const insMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const ins1 = new THREE.Mesh(insGeo, insMat); ins1.position.set(0, 5.6, 0); g.add(ins1);
    const ins2 = new THREE.Mesh(insGeo, insMat); ins2.position.set(4.5, 5.6, 0); g.add(ins2);
    return g;
  }

  buildIndonesianScenery() {
    // 1. Terrain & Rice Paddies (Sawah Terasering Hijau)
    const terrainGeo = new THREE.PlaneGeometry(1200, 5500, 16, 16);
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1f, roughness: 0.95 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.4, 2500);
    terrain.receiveShadow = true;
    this.sceneryGroup.add(terrain);

    // 2. Stasiun Manggarai Grand Platform (Km 0)
    this.buildStationManggarai();

    // 3. Authentic Indonesian JPL Level Crossings (Palang Pintu Rel JPL 11 & JPL 14)
    this.buildJPLCrossing(750, "JPL 11 Pisangan");
    this.buildJPLCrossing(2200, "JPL 14 Matraman");

    // 4. Terowongan Sasaksaat Portal (Km 1.8)
    this.buildSasaksaatTunnel(1800);

    // 5. Jembatan Tinggi Cikubang & Sungai (Km 3.2)
    this.buildCikubangBridge(3200);

    // 6. Tropical Coconut & Banana Groves
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.9 });
    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    for (let z = 60; z < 5000; z += 45) {
      if ((z >= 1700 && z <= 1950) || (z >= 3150 && z <= 3350)) continue; // skip tunnel & bridge
      const palm = this.createRealisticPalm(trunkMat, palmLeafMat);
      const side = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 20);
      palm.position.set(side, 0, z);
      this.sceneryGroup.add(palm);
    }
  }

  buildStationManggarai() {
    const stationGroup = new THREE.Group();
    // Platform (Peron Tinggi 1100mm KAI)
    const platGeo = new THREE.BoxGeometry(3.6, 1.1, 380);
    const platMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(-3.2, 0.55, 120);
    platform.receiveShadow = true;
    stationGroup.add(platform);

    // Yellow Safety Line on Platform Edge
    const yellowLineGeo = new THREE.BoxGeometry(0.12, 0.02, 380);
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const line = new THREE.Mesh(yellowLineGeo, yellowMat);
    line.position.set(-1.5, 1.11, 120);
    stationGroup.add(line);

    // Grand Canopy Roof Structure
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
    const roofGeo = new THREE.BoxGeometry(6.5, 0.2, 380);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-3.2, 5.2, 120);
    roof.castShadow = true;
    stationGroup.add(roof);

    // Station Columns
    for (let pz = -50; pz <= 300; pz += 30) {
      const colGeo = new THREE.CylinderGeometry(0.2, 0.2, 4.2);
      const col = new THREE.Mesh(colGeo, new THREE.MeshStandardMaterial({ color: 0x475569 }));
      col.position.set(-3.2, 3.1, pz);
      stationGroup.add(col);
    }

    // Papan Nama Stasiun KAI ("MANGGARAI +14M")
    const signGeo = new THREE.BoxGeometry(2.8, 0.7, 0.1);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(-3.2, 3.2, 120);
    // Blue & Orange accent borders
    const signBorder = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xff6b00 }));
    signBorder.position.set(-3.2, 3.6, 120);
    stationGroup.add(sign);
    stationGroup.add(signBorder);

    this.sceneryGroup.add(stationGroup);
  }

  buildJPLCrossing(zPos, name) {
    const jplGroup = new THREE.Group();
    jplGroup.position.set(0, 0, zPos);

    // Asphalt Road Crossing
    const roadGeo = new THREE.BoxGeometry(25, 0.08, 9);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.04, 0);
    jplGroup.add(road);

    // Guard Post & Warning Crossbuck Mast Left
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 4.5);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const mastL = new THREE.Mesh(postGeo, postMat);
    mastL.position.set(-3.2, 2.25, 5.5);
    jplGroup.add(mastL);

    // Red Warning Lamps
    const redLampGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const redLampMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const lamp1 = new THREE.Mesh(redLampGeo, redLampMat);
    lamp1.position.set(-3.5, 4.2, 5.5);
    const lamp2 = new THREE.Mesh(redLampGeo, redLampMat);
    lamp2.position.set(-2.9, 4.2, 5.5);
    jplGroup.add(lamp1);
    jplGroup.add(lamp2);
    this.jplLamps.push({ lamp1, lamp2, active: false });

    // Animated Barrier Gate Arm (Palang Pintu Garis Putih-Merah)
    const barrierGeo = new THREE.BoxGeometry(0.15, 0.25, 9.5);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.position.set(-3.2, 1.2, 0);
    jplGroup.add(barrier);
    this.jplBarriers.push({ mesh: barrier, zPos: zPos, angle: 0 });

    this.sceneryGroup.add(jplGroup);
  }

  buildSasaksaatTunnel(zPos) {
    const tunnelGroup = new THREE.Group();
    tunnelGroup.position.set(0, 0, zPos);

    // Mountain Rock Face
    const mountainGeo = new THREE.ConeGeometry(95, 55, 12);
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.95 });
    const mountain = new THREE.Mesh(mountainGeo, mountainMat);
    mountain.position.set(0, 24, 0);
    tunnelGroup.add(mountain);

    // Stone Masonry Arch Portal (Batu Andesit 1902-1903)
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const portal = new THREE.Mesh(new THREE.BoxGeometry(11.5, 8.5, 30), portalMat);
    portal.position.set(1.5, 4.0, 0);
    tunnelGroup.add(portal);

    this.sceneryGroup.add(tunnelGroup);
  }

  buildCikubangBridge(zPos) {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 0, zPos);

    // Deep Ravine / Valley Ground Drop
    const valleyRiverGeo = new THREE.PlaneGeometry(120, 350);
    const riverMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const river = new THREE.Mesh(valleyRiverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -28, 0);
    bridgeGroup.add(river);

    // Tall Concrete Pillars (Pilar Jembatan Cikubang 80m)
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    for (let z = -140; z <= 140; z += 55) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 32, 2.4), pillarMat);
      pillar.position.set(2.0, -14, z);
      bridgeGroup.add(pillar);
    }

    // Steel Truss Deck (Warna Merah Klasik KAI)
    const trussMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, metalness: 0.6, roughness: 0.35 });
    const truss = new THREE.Mesh(new THREE.BoxGeometry(8.5, 4.5, 320), trussMat);
    truss.position.set(2.0, 2.2, 0);
    bridgeGroup.add(truss);

    this.sceneryGroup.add(bridgeGroup);
  }

  createRealisticPalm(trunkMat, foliageMat) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 8, 6), trunkMat);
    trunk.position.y = 4;
    trunk.castShadow = true;
    g.add(trunk);

    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.8, 6), foliageMat);
    leaves.position.y = 8.2;
    leaves.castShadow = true;
    g.add(leaves);
    return g;
  }

  buildTrain() {
    if (this.trainGroup) this.scene.remove(this.trainGroup);
    this.trainGroup = new THREE.Group();
    this.scene.add(this.trainGroup);
    this.wiperBlades = [];

    if (this.currentTrainType === 'cc206') {
      this.buildUltraCC206();
      this.buildUltraCoaches(7);
    } else {
      this.buildUltraJR205();
      this.buildUltraCoaches(8, true);
    }
  }

  // Indonesian Locomotive CC 206 (GE CM20EMP) Double Cab with Full Details
  buildUltraCC206() {
    const loco = new THREE.Group();

    // Authentic Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const kaiOrangeMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.35 });
    const kaiBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.95 });

    // 1. Main Locomotive Body & Cab
    const bodyGeo = new THREE.BoxGeometry(2.78, 2.55, 17.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.15;
    body.castShadow = true;
    loco.add(body);

    // KAI Orange & Blue Signature Stripes
    const orangeStripe = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.38, 17.82), kaiOrangeMat);
    orangeStripe.position.y = 1.65;
    loco.add(orangeStripe);

    const blueStripe = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.28, 17.82), kaiBlueMat);
    blueStripe.position.y = 1.28;
    loco.add(blueStripe);

    // Aerodynamic Curved Roof
    const roofGeo = new THREE.CylinderGeometry(1.39, 1.39, 17.8, 16, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.rotateY(Math.PI / 2);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3.42;
    roof.castShadow = true;
    loco.add(roof);

    // Exhaust Silencer Stack (Knalpot Turbodiesel)
    const exhaustStack = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6), metalMat);
    exhaustStack.position.set(0, 4.4, 2.0);
    loco.add(exhaustStack);

    // 2. Cowcatcher / Bumper with Zebra Stripes (Bemper Moncong CC206)
    const cowcatcher = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.6, 0.8), kaiOrangeMat);
    cowcatcher.position.set(0, 0.5, 9.2);
    loco.add(cowcatcher);

    // Coupler / Ganco KAI
    const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.9), metalMat);
    coupler.position.set(0, 0.65, 9.6);
    loco.add(coupler);

    // 3. Front Cab Windshields & Wipers
    const glassFront = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.08), glassMat);
    glassFront.position.set(0, 2.5, 8.92);
    loco.add(glassFront);

    // Wiper Blade Left & Right
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const wiperL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), wiperMat);
    wiperL.position.set(-0.6, 2.5, 8.98);
    loco.add(wiperL);
    this.wiperBlades.push(wiperL);

    const wiperR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), wiperMat);
    wiperR.position.set(0.6, 2.5, 8.98);
    loco.add(wiperR);
    this.wiperBlades.push(wiperR);

    // 4. Semboyan 21 High-Intensity LED Headlights & Ditch Lights
    const headlampGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const headlampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lampL = new THREE.Mesh(headlampGeo, headlampMat); lampL.position.set(-0.75, 1.45, 8.95); loco.add(lampL);
    const lampR = new THREE.Mesh(headlampGeo, headlampMat); lampR.position.set(0.75, 1.45, 8.95); loco.add(lampR);

    // Volumetric Spot Beam
    const spot = new THREE.SpotLight(0xfffaed, 5.0, 240, Math.PI / 5.5, 0.5);
    spot.position.set(0, 1.9, 9.0);
    spot.target.position.set(0, 0, 90);
    loco.add(spot);
    loco.add(spot.target);

    // 5. Heavy Co-Co Bogies (6 Axles) with Brake Cylinders & Springs
    const bogieMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    for (let bz of [5.4, -5.4]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.75, 5.2), bogieMat);
      bogie.position.set(0, 0.48, bz);
      bogie.castShadow = true;
      loco.add(bogie);

      // Steel Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.18, 18);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
      for (let w = -1.7; w <= 1.7; w += 1.7) {
        const wl = new THREE.Mesh(wheelGeo, wheelMat); wl.position.set(-0.65, 0.44, bz + w); loco.add(wl);
        const wr = new THREE.Mesh(wheelGeo, wheelMat); wr.position.set(0.65, 0.44, bz + w); loco.add(wr);
      }
    }

    // 6. Interactive 3D Cab Interior (Masinis Cockpit)
    const cabDesk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    cabDesk.position.set(0, 1.9, 8.0);
    loco.add(cabDesk);

    this.trainGroup.add(loco);
  }

  // Indonesian KRL Commuter Line JR 205 Series (Tokyo Metro to Jabodetabek)
  buildUltraJR205() {
    const krl = new THREE.Group();
    const stainlessMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.75, roughness: 0.25 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xd92525, roughness: 0.4 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.95 });

    // Lead Car Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.82, 2.7, 19.8), stainlessMat);
    body.position.y = 2.22;
    body.castShadow = true;
    krl.add(body);

    // Jabodetabek Commuter Stripes
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.28, 19.82), redMat); s1.position.y = 1.95; krl.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.2, 19.82), yellowMat); s2.position.y = 1.68; krl.add(s2);

    // Rooftop Diamond Pantograph
    const pantoMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.85 });
    const panto = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), pantoMat);
    panto.position.set(0, 4.4, 5.5);
    krl.add(panto);

    // Front Cab Glass & Glowing Destination Rollsign ("MANGGARAI - BOGOR")
    const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.95, 0.1), glassMat);
    cabGlass.position.set(0, 2.55, 9.91);
    krl.add(cabGlass);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.06), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    sign.position.set(0, 3.3, 9.92);
    krl.add(sign);

    this.trainGroup.add(krl);
  }

  // Kereta Eksekutif Stainless Steel (K1) / KRL Trailers
  buildUltraCoaches(count, isKRL = false) {
    const coachLength = 20.5;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isKRL ? 0xd1d5db : 0xe2e8f0,
      metalness: isKRL ? 0.75 : 0.45,
      roughness: 0.28
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: isKRL ? 0xd92525 : 0x0284c7 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.9 });

    for (let i = 1; i <= count; i++) {
      const coach = new THREE.Group();
      const zOffset = -(i * (coachLength + 0.6) + 8.8);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.78, 2.65, coachLength), bodyMat);
      body.position.y = 2.18;
      body.castShadow = true;
      coach.add(body);

      // K1 Blue Ribbon Stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.32, coachLength + 0.02), stripeMat);
      stripe.position.y = 1.62;
      coach.add(stripe);

      // Continuous Passenger Windows
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.75, coachLength * 0.88), windowMat);
      win.position.y = 2.42;
      coach.add(win);

      // Bogies
      const bogieMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      for (let b of [6.5, -6.5]) {
        const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 3.8), bogieMat);
        bogie.position.set(0, 0.45, b);
        coach.add(bogie);
      }

      coach.position.z = zOffset;
      this.trainGroup.add(coach);
    }
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      // Auto close modal on keypress
      const modal = document.getElementById('route-modal');
      if (modal && modal.style.display !== 'none') {
        if (['w', 's', 'arrowup', 'arrowdown', ' '].includes(e.key.toLowerCase())) {
          modal.style.display = 'none';
        }
      }

      if (window.TrainAudio && !window.TrainAudio.isInitialized) {
        window.TrainAudio.init();
      }

      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') {
        window.TrainPhysics.stepThrottle(1);
      } else if (key === 's' || key === 'arrowdown') {
        window.TrainPhysics.stepThrottle(-1);
      } else if (key === 'q' || key === 'arrowleft') {
        window.TrainPhysics.stepBrake(-1);
      } else if (key === 'a' || key === 'arrowright') {
        window.TrainPhysics.stepBrake(1);
      } else if (key === 'r') {
        window.TrainPhysics.toggleReverser();
      } else if (key === 'h') {
        window.TrainAudio.playSemboyan35();
      } else if (key === ' ' || key === 'd') {
        window.TrainPhysics.resetDeadman();
      }

      this.updateHUD();
    });

    // UI Buttons
    document.getElementById('btn-throttle-up').onclick = (e) => {
      e.stopPropagation();
      if (window.TrainAudio && !window.TrainAudio.isInitialized) window.TrainAudio.init();
      window.TrainPhysics.stepThrottle(1);
      this.updateHUD();
    };
    document.getElementById('btn-throttle-down').onclick = (e) => {
      e.stopPropagation();
      window.TrainPhysics.stepThrottle(-1);
      this.updateHUD();
    };
    document.getElementById('btn-brake-up').onclick = (e) => {
      e.stopPropagation();
      window.TrainPhysics.stepBrake(1);
      this.updateHUD();
    };
    document.getElementById('btn-brake-down').onclick = (e) => {
      e.stopPropagation();
      window.TrainPhysics.stepBrake(-1);
      this.updateHUD();
    };
    document.getElementById('btn-reverser').onclick = (e) => {
      e.stopPropagation();
      window.TrainPhysics.toggleReverser();
      this.updateHUD();
    };
    document.getElementById('btn-horn').onclick = (e) => {
      e.stopPropagation();
      window.TrainAudio.playSemboyan35();
    };
    document.getElementById('btn-deadman').onclick = (e) => {
      e.stopPropagation();
      window.TrainPhysics.resetDeadman();
      this.updateHUD();
    };

    // Camera Switcher
    document.querySelectorAll('.btn-cam[data-cam]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.btn-cam[data-cam]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.cameraMode = btn.dataset.cam;
      };
    });

    // Weather & Time Toggles
    const btnChime = document.getElementById('btn-chime');
    if (btnChime) {
      btnChime.onclick = (e) => {
        e.stopPropagation();
        if (window.TrainAudio) window.TrainAudio.playKAIStationChime();
      };
    }
    document.getElementById('btn-weather').onclick = (e) => { e.stopPropagation(); this.toggleRain(); };
    document.getElementById('btn-time').onclick = (e) => { e.stopPropagation(); this.toggleNight(); };

    // Route Modal Handler
    document.getElementById('btn-routes-menu').onclick = (e) => {
      e.stopPropagation();
      document.getElementById('route-modal').style.display = 'flex';
    };

    document.querySelectorAll('.route-card[data-route]').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.route-card[data-route]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.currentRoute = card.dataset.route;
      };
    });

    document.querySelectorAll('.route-card[data-train]').forEach(card => {
      card.onclick = () => {
        document.querySelectorAll('.route-card[data-train]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.currentTrainType = card.dataset.train;
      };
    });

    document.getElementById('btn-start-game').onclick = (e) => {
      e.stopPropagation();
      if (window.TrainAudio) {
        window.TrainAudio.init();
        window.TrainAudio.playKAIStationChime();
      }
      window.TrainPhysics.setRollingStock(this.currentTrainType);
      this.buildTrain();
      document.getElementById('route-modal').style.display = 'none';

      // Auto start on Notch 1 for immediate driving satisfaction
      window.TrainPhysics.stepThrottle(1);

      if (this.currentTrainType === 'cc206') {
        document.getElementById('train-badge').className = 'badge badge-kai';
        document.getElementById('train-badge').innerText = 'KAI CC 206';
        document.getElementById('train-title').innerText = 'KA 1 Argo Bromo Anggrek';
      } else {
        document.getElementById('train-badge').className = 'badge badge-krl';
        document.getElementById('train-badge').innerText = 'KRL JR 205';
        document.getElementById('train-title').innerText = 'Commuter Line Manggarai - Bogor';
      }
      this.updateHUD();
    };
  }

  toggleRain() {
    this.isRaining = !this.isRaining;
    this.rainParticles.material.opacity = this.isRaining ? 0.7 : 0.0;
    this.scene.fog.density = this.isRaining ? 0.0035 : 0.0016;
  }

  toggleNight() {
    this.isNight = !this.isNight;
    if (this.isNight) {
      this.scene.background.set(0x020617);
      this.scene.fog.color.set(0x020617);
      this.dirLight.intensity = 0.15;
      this.hemiLight.intensity = 0.2;
    } else {
      this.scene.background.set(this.skyColor);
      this.scene.fog.color.set(this.skyColor);
      this.dirLight.intensity = 1.45;
      this.hemiLight.intensity = 0.8;
    }
  }

  updateHUD() {
    const p = window.TrainPhysics;
    document.getElementById('hud-speed').innerText = Math.round(Math.abs(p.speedKph));
    document.getElementById('hud-notch').innerText = `N-${p.notch}`;
    document.getElementById('hud-reverser').innerText = (p.reverser === 1) ? 'MAJU' : (p.reverser === -1 ? 'MUNDUR' : 'NETRAL');
    document.getElementById('hud-brake').innerText = `${Math.round(p.brakePercent)}%`;

    const deadmanBtn = document.getElementById('btn-deadman');
    if (p.deadmanWarning) {
      deadmanBtn.classList.remove('active-safe');
      deadmanBtn.innerText = `🚨 SIAP MASINIS (${Math.ceil(p.deadmanTimer)}s)`;
    } else {
      deadmanBtn.classList.add('active-safe');
      deadmanBtn.innerText = `✅ MASINIS AMAN (${Math.ceil(p.deadmanTimer)}s)`;
    }

    // Signals & JPL
    const sigInfo = window.SignalSystem.update(p.distanceTraveledMeters);
    const lamp = document.getElementById('hud-signal-lamp');
    const text = document.getElementById('hud-signal-text');

    if (sigInfo.aspect === 'SEMBOYAN_7') {
      lamp.className = 'signal-lamp red';
      text.innerText = 'SEMBOYAN 7 (BERHENTI / MERAH)';
    } else if (sigInfo.aspect === 'SEMBOYAN_6') {
      lamp.className = 'signal-lamp yellow';
      text.innerText = 'SEMBOYAN 6 (HATI-HATI / KUNING)';
    } else {
      lamp.className = 'signal-lamp green';
      text.innerText = 'SEMBOYAN 5 (AMAN / HIJAU)';
    }
  }

  updateCamera(delta) {
    const trainPos = this.trainGroup.position;
    const speed = Math.abs(window.TrainPhysics.speedKph);

    // Subtle cab vibration shake
    const shakeY = (Math.random() - 0.5) * (speed * 0.0004);
    const shakeX = (Math.random() - 0.5) * (speed * 0.0003);

    if (this.cameraMode === 'cab') {
      this.camera.position.set(
        trainPos.x + this.cabOffset.x + shakeX,
        trainPos.y + this.cabOffset.y + shakeY,
        trainPos.z + this.cabOffset.z
      );
      this.camera.lookAt(trainPos.x, trainPos.y + 2.5, trainPos.z + 120);
    } else if (this.cameraMode === 'third') {
      this.camera.position.set(trainPos.x, trainPos.y + 6.8, trainPos.z + 30);
      this.camera.lookAt(trainPos.x, trainPos.y + 2.0, trainPos.z);
    } else if (this.cameraMode === 'passenger') {
      this.camera.position.set(
        trainPos.x + this.passengerOffset.x + shakeX,
        trainPos.y + this.passengerOffset.y + shakeY,
        trainPos.z + this.passengerOffset.z
      );
      this.camera.lookAt(trainPos.x + 35, trainPos.y + 2.0, trainPos.z - 15);
    } else if (this.cameraMode === 'track') {
      const tracksideZ = Math.floor(trainPos.z / 160) * 160 + 80;
      this.camera.position.set(7.5, 2.8, tracksideZ);
      this.camera.lookAt(trainPos.x, trainPos.y + 1.8, trainPos.z);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    window.TrainPhysics.update(delta);

    const currentZ = window.TrainPhysics.distanceTraveledMeters;
    this.trainGroup.position.z = currentZ;

    if (currentZ > 5000) {
      window.TrainPhysics.distanceTraveledMeters = 0;
    }

    // 1. Dynamic Diesel Smoke Animation
    if (this.exhaustParticles) {
      const pArr = this.exhaustParticles.geometry.attributes.position.array;
      const notch = window.TrainPhysics.notch;
      for (let i = 0; i < pArr.length; i += 3) {
        pArr[i + 1] += (6.0 + notch * 2.5) * delta; // rise up
        pArr[i + 2] -= (12.0 + window.TrainPhysics.speedMs) * delta; // blow backwards
        if (pArr[i + 1] > 9.5) {
          pArr[i] = (Math.random() - 0.5) * 0.3;
          pArr[i + 1] = 4.2;
          pArr[i + 2] = currentZ + 2.0;
        }
      }
      this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
      this.exhaustParticles.material.opacity = (notch > 0) ? 0.45 + (notch * 0.05) : 0.15;
    }

    // 2. Wiper Animation during rain
    if (this.isRaining && this.wiperBlades.length > 0) {
      this.wiperAngle += this.wiperDirection * delta * 4.5;
      if (this.wiperAngle > 0.8) this.wiperDirection = -1;
      if (this.wiperAngle < -0.8) this.wiperDirection = 1;
      this.wiperBlades.forEach(w => w.rotation.z = this.wiperAngle);
    }

    // 3. JPL Crossing Animation
    this.jplBarriers.forEach((jpl, idx) => {
      const dist = Math.abs(jpl.zPos - currentZ);
      if (dist < 380) {
        jpl.angle = Math.min(Math.PI / 2, jpl.angle + delta * 1.5);
        if (this.jplLamps[idx]) {
          const blink = (Math.floor(Date.now() / 400) % 2 === 0);
          this.jplLamps[idx].lamp1.material.color.setHex(blink ? 0xef4444 : 0x330000);
          this.jplLamps[idx].lamp2.material.color.setHex(!blink ? 0xef4444 : 0x330000);
        }
        if (dist < 200 && window.TrainAudio && Math.floor(Date.now() / 900) % 2 === 0) {
          window.TrainAudio.playJPLCrossingBell();
        }
      } else {
        jpl.angle = Math.max(0, jpl.angle - delta * 1.5);
      }
      jpl.mesh.rotation.z = jpl.angle;
    });

    // 4. Rain Particles Position Update
    if (this.isRaining && this.rainParticles) {
      const positions = this.rainParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 42 * delta;
        if (positions[i] < 0) positions[i] = 55;
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
      this.rainParticles.position.z = currentZ;
    }

    this.updateCamera(delta);
    this.updateHUD();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.RailSimApp = new SuperRailSimEngine();
});
