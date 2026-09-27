/**
 * ID-RailSim 3D Engine (Three.js WebGL)
 * Ultra-optimized modular 3D Train Simulation
 */

class RailSimEngine {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Game state
    this.currentTrainType = 'cc206';
    this.currentRoute = 'jakarta';
    this.cameraMode = 'cab'; // 'cab', 'third', 'track', 'passenger'

    // Scene Groups
    this.trainGroup = null;
    this.trackGroup = null;
    this.sceneryGroup = null;
    this.rainParticles = null;

    // Lighting & Environment
    this.dirLight = null;
    this.hemiLight = null;
    this.isNight = false;
    this.isRaining = false;

    // References for dynamic updates
    this.signalObjects = [];
    this.crossingObjects = [];
    this.cabCameraOffset = new THREE.Vector3(0.5, 2.7, 8.2);
    this.passCameraOffset = new THREE.Vector3(0.9, 2.2, -15.0);

    this.initThree();
    this.setupEnvironment();
    this.buildTrackAndScenery();
    this.buildTrain();
    this.setupEventListeners();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Tropical Sky Blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0018);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 3, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupEnvironment() {
    // Hemispheric Ambient Light
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d5236, 0.75);
    this.scene.add(this.hemiLight);

    // Directional Sunlight with Shadows
    this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    this.dirLight.position.set(80, 150, 60);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 400;
    const d = 60;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // Tropical Rain System
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 4000;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 120;
      rainPos[i + 1] = Math.random() * 50;
      rainPos[i + 2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.18,
      transparent: true,
      opacity: 0.0
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainParticles);
  }

  buildTrackAndScenery() {
    this.trackGroup = new THREE.Group();
    this.sceneryGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    this.scene.add(this.sceneryGroup);

    // Materials
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const catenaryMastMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.5 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

    const trackLength = 5000; // 5 km track section
    const gaugeHalf = 1.067 / 2; // Indonesian 1067mm Cape Gauge

    // 1. Ballast Bed (Gravel)
    const ballastGeo = new THREE.BoxGeometry(3.6, 0.4, trackLength);
    const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
    ballastMesh.position.set(0, -0.2, trackLength / 2 - 200);
    ballastMesh.receiveShadow = true;
    this.trackGroup.add(ballastMesh);

    // Second track (Double Track)
    const ballast2 = ballastMesh.clone();
    ballast2.position.x = 4.2;
    this.trackGroup.add(ballast2);

    // 2. Concrete Sleepers (Instanced for extreme low-credit optimization)
    const sleeperCount = Math.floor(trackLength / 0.6);
    const sleeperGeo = new THREE.BoxGeometry(2.2, 0.18, 0.26);
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

    // 3. Steel Rails (Left & Right)
    const railGeo = new THREE.BoxGeometry(0.08, 0.16, trackLength);
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-gaugeHalf, 0.2, trackLength / 2 - 200);
    leftRail.castShadow = true;
    this.trackGroup.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(gaugeHalf, 0.2, trackLength / 2 - 200);
    rightRail.castShadow = true;
    this.trackGroup.add(rightRail);

    // 4. LAA Catenary Gantries & Wires (Jabodetabek Electrification)
    for (let z = 0; z < trackLength; z += 45) {
      const gantry = this.createCatenaryGantry(catenaryMastMat);
      gantry.position.set(0, 0, z);
      this.trackGroup.add(gantry);
    }

    // Overhead Contact Wire
    const wireGeo = new THREE.CylinderGeometry(0.015, 0.015, trackLength, 4);
    wireGeo.rotateX(Math.PI / 2);
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.set(0, 5.2, trackLength / 2 - 200);
    this.trackGroup.add(wireMesh);

    // 5. Scenery Objects: Station, Mountain Tunnel, Cikubang Bridge, Tropical Trees
    this.buildSceneryLandmarks();
  }

  createCatenaryGantry(material) {
    const group = new THREE.Group();
    // Mast Pole Left
    const mastGeo = new THREE.BoxGeometry(0.2, 6.0, 0.2);
    const mastLeft = new THREE.Mesh(mastGeo, material);
    mastLeft.position.set(-2.4, 3.0, 0);
    group.add(mastLeft);

    // Mast Pole Right
    const mastRight = new THREE.Mesh(mastGeo, material);
    mastRight.position.set(6.6, 3.0, 0);
    group.add(mastRight);

    // Cross Beam
    const beamGeo = new THREE.BoxGeometry(9.2, 0.2, 0.2);
    const beam = new THREE.Mesh(beamGeo, material);
    beam.position.set(2.1, 5.8, 0);
    group.add(beam);

    // Dropper insulator
    const insGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
    const ins = new THREE.Mesh(insGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    ins.position.set(0, 5.5, 0);
    group.add(ins);

    return group;
  }

  buildSceneryLandmarks() {
    // Ground Terrain
    const groundGeo = new THREE.PlaneGeometry(800, 5500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x22543d, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.4, 2500);
    ground.receiveShadow = true;
    this.sceneryGroup.add(ground);

    // Manggarai / Gambir Style Station Platform (Km 0)
    const platformGeo = new THREE.BoxGeometry(3.0, 1.1, 350);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(-2.8, 0.55, 100);
    platform.receiveShadow = true;
    this.sceneryGroup.add(platform);

    // Station Roof Shelter
    const roofGeo = new THREE.BoxGeometry(3.6, 0.1, 350);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-2.8, 4.2, 100);
    this.sceneryGroup.add(roof);

    // Tropical Palm Trees along the line
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    for (let z = 50; z < 4800; z += 60) {
      const palm = this.createPalmTree(trunkMat, foliageMat);
      const side = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 15);
      palm.position.set(side, 0, z);
      this.sceneryGroup.add(palm);
    }

    // Sasaksaat Tunnel Portal (at Km 1.8)
    const tunnelGroup = new THREE.Group();
    const portalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x1e3a24, roughness: 0.95 });

    // Mountain Rock
    const mountainGeo = new THREE.ConeGeometry(80, 45, 8);
    const mountain = new THREE.Mesh(mountainGeo, mountainMat);
    mountain.position.set(0, 20, 1800);
    this.sceneryGroup.add(mountain);

    // Tunnel Arch
    const portalGeo = new THREE.BoxGeometry(10, 8, 40);
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, 3.8, 1800);
    this.sceneryGroup.add(portal);

    // Cikubang High Truss Bridge (at Km 3.0)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.6, roughness: 0.4 }); // KAI Red Bridge
    for (let z = 3000; z < 3400; z += 40) {
      const pillarGeo = new THREE.BoxGeometry(1.5, 25, 1.5);
      const pillar = new THREE.Mesh(pillarGeo, new THREE.MeshStandardMaterial({ color: 0x64748b }));
      pillar.position.set(0, -12, z);
      this.sceneryGroup.add(pillar);

      const trussGeo = new THREE.BoxGeometry(4.8, 4.5, 38);
      const truss = new THREE.Mesh(trussGeo, bridgeMat);
      truss.position.set(0, 2.2, z + 19);
      this.sceneryGroup.add(truss);
    }

    // Signals & JPL Crossing Meshes
    this.buildSignalsAndJPL();
  }

  createPalmTree(trunkMat, foliageMat) {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 7, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    group.add(trunk);

    const leafGeo = new THREE.ConeGeometry(2.5, 3, 5);
    const leaf = new THREE.Mesh(leafGeo, foliageMat);
    leaf.position.y = 7;
    leaf.castShadow = true;
    group.add(leaf);
    return group;
  }

  buildSignalsAndJPL() {
    // Semboyan Light Posts
    const signalPosts = [300, 1200, 2400, 4000];
    signalPosts.forEach((zPos, idx) => {
      const postGroup = new THREE.Group();
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 4.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      mast.position.y = 2.25;
      postGroup.add(mast);

      // Signal Head (3-aspect)
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.9, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      head.position.set(0, 4.0, 0);
      postGroup.add(head);

      // Green Lamp
      const greenLamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.1),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      greenLamp.position.set(0, 4.25, 0.1);
      postGroup.add(greenLamp);

      postGroup.position.set(2.4, 0, zPos);
      this.sceneryGroup.add(postGroup);
    });
  }

  buildTrain() {
    if (this.trainGroup) this.scene.remove(this.trainGroup);
    this.trainGroup = new THREE.Group();
    this.scene.add(this.trainGroup);

    if (this.currentTrainType === 'cc206') {
      this.buildCC206Locomotive();
      this.buildCoaches(6);
    } else {
      this.buildJR205EMU();
      this.buildCoaches(7, true);
    }
  }

  // Indonesian Locomotive CC 206 (GE CM20EMP) Double Cab
  buildCC206Locomotive() {
    const loco = new THREE.Group();

    // Body Material: Classic KAI White / Orange / Blue stripe
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const blueStripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const orangeStripeMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    // Main Locomotive Body
    const bodyGeo = new THREE.BoxGeometry(2.7, 2.5, 17.5);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 2.1;
    bodyMesh.castShadow = true;
    loco.add(bodyMesh);

    // KAI Blue & Orange Accent Stripes
    const stripeGeo = new THREE.BoxGeometry(2.72, 0.35, 17.52);
    const stripeMesh = new THREE.Mesh(stripeGeo, orangeStripeMat);
    stripeMesh.position.y = 1.6;
    loco.add(stripeMesh);

    const stripe2Geo = new THREE.BoxGeometry(2.72, 0.25, 17.52);
    const stripe2Mesh = new THREE.Mesh(stripe2Geo, blueStripeMat);
    stripe2Mesh.position.y = 1.25;
    loco.add(stripe2Mesh);

    // Roof & Radiator Grilles
    const roofGeo = new THREE.CylinderGeometry(1.35, 1.35, 17.5, 12, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.rotateY(Math.PI / 2);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.y = 3.35;
    roofMesh.castShadow = true;
    loco.add(roofMesh);

    // Cab Windshields (Front & Rear Cab for CC206)
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.1), glassMat);
    frontGlass.position.set(0, 2.4, 8.76);
    loco.add(frontGlass);

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.1), glassMat);
    rearGlass.position.set(0, 2.4, -8.76);
    loco.add(rearGlass);

    // Semboyan 21 High Intensity Headlights (Lampu Utama & Kabut)
    const headlightGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const headlightL = new THREE.Mesh(headlightGeo, headlightMat);
    headlightL.position.set(-0.7, 1.4, 8.8);
    loco.add(headlightL);

    const headlightR = headlightL.clone();
    headlightR.position.x = 0.7;
    loco.add(headlightR);

    // Headlight Spot Light
    const spot = new THREE.SpotLight(0xfffaed, 4.0, 180, Math.PI / 6, 0.4);
    spot.position.set(0, 1.8, 8.8);
    spot.target.position.set(0, 0, 70);
    loco.add(spot);
    loco.add(spot.target);

    // Bogies Co-Co (6 axles)
    const bogieMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const bogieGeo = new THREE.BoxGeometry(2.4, 0.7, 5.0);
    const bogieFront = new THREE.Mesh(bogieGeo, bogieMat);
    bogieFront.position.set(0, 0.45, 5.2);
    bogieFront.castShadow = true;
    loco.add(bogieFront);

    const bogieRear = bogieFront.clone();
    bogieRear.position.z = -5.2;
    loco.add(bogieRear);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
    for (let b of [5.2, -5.2]) {
      for (let w = -1.6; w <= 1.6; w += 1.6) {
        const wl = new THREE.Mesh(wheelGeo, wheelMat);
        wl.position.set(-0.6, 0.42, b + w);
        loco.add(wl);

        const wr = new THREE.Mesh(wheelGeo, wheelMat);
        wr.position.set(0.6, 0.42, b + w);
        loco.add(wr);
      }
    }

    this.trainGroup.add(loco);
  }

  // Indonesian KRL Commuter Line JR 205 Series
  buildJR205EMU() {
    const krl = new THREE.Group();
    const stainlessMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.7, roughness: 0.3 });
    const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xd92525, roughness: 0.4 });
    const yellowStripeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    // KRL Lead Car Body
    const bodyGeo = new THREE.BoxGeometry(2.8, 2.7, 19.5);
    const body = new THREE.Mesh(bodyGeo, stainlessMat);
    body.position.y = 2.2;
    body.castShadow = true;
    krl.add(body);

    // Commuter Line Stripes (Red & Yellow)
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.25, 19.52), redStripeMat);
    stripe1.position.y = 1.9;
    krl.add(stripe1);

    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.18, 19.52), yellowStripeMat);
    stripe2.position.y = 1.65;
    krl.add(stripe2);

    // Curved Roof
    const roofGeo = new THREE.BoxGeometry(2.7, 0.3, 19.5);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    roof.position.y = 3.65;
    krl.add(roof);

    // Pantograph Diamond Frame on Roof
    const pantoMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.8 });
    const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.8), pantoMat);
    pantoBase.position.set(0, 4.3, 5.0);
    krl.add(pantoBase);

    // Front Cab Glass & Destination Board
    const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.1), glassMat);
    cabGlass.position.set(0, 2.5, 9.76);
    krl.add(cabGlass);

    // Destination Rollsign (MANGGARAI - BOGOR)
    const signGeo = new THREE.BoxGeometry(1.2, 0.3, 0.05);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 3.2, 9.77);
    krl.add(sign);

    this.trainGroup.add(krl);
  }

  // Passenger Coaches (Kereta Eksekutif K1 / KRL Cars)
  buildCoaches(count, isKRL = false) {
    const coachLength = 20.0;
    const coachMat = new THREE.MeshStandardMaterial({
      color: isKRL ? 0xd1d5db : 0xe2e8f0,
      metalness: isKRL ? 0.7 : 0.4,
      roughness: 0.3
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: isKRL ? 0xd92525 : 0x0284c7 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.8 });

    for (let i = 1; i <= count; i++) {
      const coach = new THREE.Group();
      const zOffset = -(i * (coachLength + 0.8) + 8.5);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.75, 2.6, coachLength), coachMat);
      body.position.y = 2.15;
      body.castShadow = true;
      coach.add(body);

      // K1 Blue / KRL Red Stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.77, 0.3, coachLength + 0.02), stripeMat);
      stripe.position.y = 1.6;
      coach.add(stripe);

      // Passenger Tinted Windows
      const winGeo = new THREE.BoxGeometry(2.78, 0.7, coachLength * 0.85);
      const win = new THREE.Mesh(winGeo, windowMat);
      win.position.y = 2.4;
      coach.add(win);

      coach.position.z = zOffset;
      this.trainGroup.add(coach);
    }
  }

  setupEventListeners() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      // Auto close modal if user presses driving keys
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
      if (window.TrainAudio) window.TrainAudio.init();
      window.TrainPhysics.setRollingStock(this.currentTrainType);
      this.buildTrain();
      document.getElementById('route-modal').style.display = 'none';

      // Auto start on Notch 1 for immediate driving satisfaction
      window.TrainPhysics.stepThrottle(1);

      // Update titles
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
    this.rainParticles.material.opacity = this.isRaining ? 0.65 : 0.0;
    this.scene.fog.density = this.isRaining ? 0.004 : 0.0018;
  }

  toggleNight() {
    this.isNight = !this.isNight;
    if (this.isNight) {
      this.scene.background.set(0x020617);
      this.scene.fog.color.set(0x020617);
      this.dirLight.intensity = 0.15;
      this.hemiLight.intensity = 0.2;
    } else {
      this.scene.background.set(0x87ceeb);
      this.scene.fog.color.set(0x87ceeb);
      this.dirLight.intensity = 1.4;
      this.hemiLight.intensity = 0.75;
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

    // Signals
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

  updateCamera() {
    const trainPos = this.trainGroup.position;

    if (this.cameraMode === 'cab') {
      // Driver Cab Masinis POV
      this.camera.position.copy(trainPos).add(this.cabCameraOffset);
      this.camera.lookAt(trainPos.x, trainPos.y + 2.5, trainPos.z + 100);
    } else if (this.cameraMode === 'third') {
      // Chase / Third Person
      this.camera.position.set(trainPos.x, trainPos.y + 6.5, trainPos.z + 28);
      this.camera.lookAt(trainPos.x, trainPos.y + 2.0, trainPos.z);
    } else if (this.cameraMode === 'passenger') {
      // Passenger Window View in Coach
      this.camera.position.copy(trainPos).add(this.passCameraOffset);
      this.camera.lookAt(trainPos.x + 30, trainPos.y + 2.0, trainPos.z - 15);
    } else if (this.cameraMode === 'track') {
      // Railfan Trackside Flyby
      const tracksideZ = Math.floor(trainPos.z / 150) * 150 + 75;
      this.camera.position.set(7.5, 2.5, tracksideZ);
      this.camera.lookAt(trainPos.x, trainPos.y + 1.8, trainPos.z);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // 1. Physics Step
    window.TrainPhysics.update(delta);

    // 2. Move Train Along Z
    const currentZ = window.TrainPhysics.distanceTraveledMeters;
    this.trainGroup.position.z = currentZ;

    // Loop back seamlessly on end of line
    if (currentZ > 4800) {
      window.TrainPhysics.distanceTraveledMeters = 0;
    }

    // 3. Dynamic Rain Animation
    if (this.isRaining && this.rainParticles) {
      const positions = this.rainParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 35 * delta;
        if (positions[i] < 0) positions[i] = 45;
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
      this.rainParticles.position.z = currentZ;
    }

    // 4. Update Camera & UI
    this.updateCamera();
    this.updateHUD();

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Auto Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.RailSimApp = new RailSimEngine();
});
