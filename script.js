const counterDOM = document.getElementById("counter");
const endDOM = document.getElementById("end");
const hintDOM = document.getElementById("hint");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd4ea);
scene.fog = new THREE.Fog(0x8fd4ea, 420, 1400);

const distance = 500;
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2,
  window.innerWidth / 2,
  window.innerHeight / 2,
  window.innerHeight / -2,
  0.1,
  10000
);

camera.rotation.x = (50 * Math.PI) / 180;
camera.rotation.y = (20 * Math.PI) / 180;
camera.rotation.z = (10 * Math.PI) / 180;

const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
const initialCameraPositionX =
  Math.tan(camera.rotation.y) *
  Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const zoom = 2;

const chickenSize = 15;

const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth * columns;

const stepTime = 200; // Miliseconds it takes for the chicken to take a step forward, backward, left or right
const facingAngles = {
  forward: 0,
  backward: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2,
};

let lanes;
let laneMeshes = [];
let currentLane;
let currentColumn;

let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;
let gameOver = false;
let targetRotationZ = 0;
let hintHidden = false;

const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110, 40, [
  { x: 10, y: 0, w: 50, h: 30 },
  { x: 70, y: 0, w: 30, h: 30 },
]);
const carLeftSideTexture = new Texture(110, 40, [
  { x: 10, y: 10, w: 50, h: 30 },
  { x: 70, y: 10, w: 30, h: 30 },
]);

const truckFrontTexture = new Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25, 30, [
  { x: 0, y: 15, w: 10, h: 10 },
]);
const truckLeftSideTexture = new Texture(25, 30, [
  { x: 0, y: 5, w: 10, h: 10 },
]);

const generateLanes = () => {
  laneMeshes.forEach((mesh) => scene.remove(mesh));
  laneMeshes = [];

  return [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((index) => {
      const lane = new Lane(index);
      lane.mesh.position.y = index * positionWidth * zoom;
      scene.add(lane.mesh);
      laneMeshes.push(lane.mesh);
      return lane;
    })
    .filter((lane) => lane.index >= 0);
};

const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index * positionWidth * zoom;
  scene.add(lane.mesh);
  laneMeshes.push(lane.mesh);
  lanes.push(lane);
};

const chicken = new Chicken();
scene.add(chicken);

hemiLight = new THREE.HemisphereLight(0xfff4dc, 0x7ec850, 0.7);
scene.add(hemiLight);

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
dirLight = new THREE.DirectionalLight(0xfff1c9, 0.7);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = chicken;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

backLight = new THREE.DirectionalLight(0x7aa7c9, 0.35);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

const laneTypes = ["car", "truck", "forest"];
const laneSpeeds = [2, 2.5, 3];
const vechicleColors = [0xa52523, 0xbdb638, 0x78b14b];
const threeHeights = [20, 45, 60];

const initaliseValues = () => {
  lanes = generateLanes();

  currentLane = 0;
  currentColumn = Math.floor(columns / 2);

  previousTimestamp = null;

  startMoving = false;
  moves = [];
  stepStartTimestamp = null;
  gameOver = false;
  targetRotationZ = 0;

  chicken.position.x = 0;
  chicken.position.y = 0;
  chicken.position.z = 0;
  chicken.rotation.z = 0;
  resetChickenPose();

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;

  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;

  counterDOM.innerHTML = 0;
};

initaliseValues();

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

function getCameraZoom() {
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  if (shortSide < 400) return 1.55;
  if (shortSide < 600) return 1.3;
  if (shortSide < 800) return 1.1;
  return 1;
}

function updateRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.left = width / -2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = height / -2;
  camera.zoom = getCameraZoom();
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
}

updateRenderer();
window.addEventListener("resize", updateRenderer);

function Texture(width, height, rects) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(0,0,0,0.6)";
  rects.forEach((rect) => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

function Wheel() {
  const wheel = new THREE.Mesh(
    new THREE.BoxBufferGeometry(12 * zoom, 33 * zoom, 12 * zoom),
    new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
  );
  wheel.position.z = 6 * zoom;
  return wheel;
}

function Car() {
  const car = new THREE.Group();
  const color =
    vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60 * zoom, 30 * zoom, 15 * zoom),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  main.position.z = 12 * zoom;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry(33 * zoom, 24 * zoom, 12 * zoom),
    [
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carBackTexture,
      }),
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carFrontTexture,
      }),
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carRightSideTexture,
      }),
      new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        flatShading: true,
        map: carLeftSideTexture,
      }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }), // bottom
    ]
  );
  cabin.position.x = 6 * zoom;
  cabin.position.z = 25.5 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -18 * zoom;
  car.add(frontWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 18 * zoom;
  car.add(backWheel);

  car.castShadow = true;
  car.receiveShadow = false;

  return car;
}

function Truck() {
  const truck = new THREE.Group();
  const color =
    vechicleColors[Math.floor(Math.random() * vechicleColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxBufferGeometry(100 * zoom, 25 * zoom, 5 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  base.position.z = 10 * zoom;
  truck.add(base);

  const cargo = new THREE.Mesh(
    new THREE.BoxBufferGeometry(75 * zoom, 35 * zoom, 40 * zoom),
    new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  cargo.position.x = 15 * zoom;
  cargo.position.z = 30 * zoom;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo);

  const cabin = new THREE.Mesh(
    new THREE.BoxBufferGeometry(25 * zoom, 30 * zoom, 30 * zoom),
    [
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // back
      new THREE.MeshPhongMaterial({
        color,
        flatShading: true,
        map: truckFrontTexture,
      }),
      new THREE.MeshPhongMaterial({
        color,
        flatShading: true,
        map: truckRightSideTexture,
      }),
      new THREE.MeshPhongMaterial({
        color,
        flatShading: true,
        map: truckLeftSideTexture,
      }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // top
      new THREE.MeshPhongMaterial({ color, flatShading: true }), // bottom
    ]
  );
  cabin.position.x = -40 * zoom;
  cabin.position.z = 20 * zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -38 * zoom;
  truck.add(frontWheel);

  const middleWheel = new Wheel();
  middleWheel.position.x = -10 * zoom;
  truck.add(middleWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 30 * zoom;
  truck.add(backWheel);

  return truck;
}

function Three() {
  const three = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.BoxBufferGeometry(15 * zoom, 15 * zoom, 20 * zoom),
    new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10 * zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  three.add(trunk);

  const height = threeHeights[Math.floor(Math.random() * threeHeights.length)];

  const crown = new THREE.Mesh(
    new THREE.BoxBufferGeometry(30 * zoom, 30 * zoom, height * zoom),
    new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true })
  );
  crown.position.z = (height / 2 + 20) * zoom;
  crown.castShadow = true;
  crown.receiveShadow = false;
  three.add(crown);

  return three;
}

function Chicken() {
  const chicken = new THREE.Group();
  const figure = new THREE.Group();
  chicken.add(figure);

  const white = 0xfff6ea;
  const cream = 0xf2d3a2;
  const beakColor = 0xff9f1c;
  const combColor = 0xff2d55;
  const eyeColor = 0x1a1a1a;
  const legColor = 0xff8c42;

  const body = new THREE.Mesh(
    new THREE.BoxBufferGeometry(chickenSize * zoom, 16 * zoom, 14 * zoom),
    new THREE.MeshPhongMaterial({ color: white, flatShading: true })
  );
  body.position.z = 16 * zoom;
  body.castShadow = true;
  body.receiveShadow = true;
  figure.add(body);

  const belly = new THREE.Mesh(
    new THREE.BoxBufferGeometry(11 * zoom, 12 * zoom, 7 * zoom),
    new THREE.MeshPhongMaterial({ color: cream, flatShading: true })
  );
  belly.position.set(0, 1 * zoom, 11 * zoom);
  figure.add(belly);

  const head = new THREE.Mesh(
    new THREE.BoxBufferGeometry(10 * zoom, 10 * zoom, 10 * zoom),
    new THREE.MeshPhongMaterial({ color: white, flatShading: true })
  );
  head.position.set(0, 10 * zoom, 26 * zoom);
  head.castShadow = true;
  figure.add(head);

  const cheekL = new THREE.Mesh(
    new THREE.BoxBufferGeometry(2.2 * zoom, 2.4 * zoom, 2.4 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xffb3c1, flatShading: true })
  );
  cheekL.position.set(-5.4 * zoom, 11 * zoom, 24.5 * zoom);
  const cheekR = cheekL.clone();
  cheekR.position.x *= -1;
  figure.add(cheekL, cheekR);

  const beak = new THREE.Mesh(
    new THREE.BoxBufferGeometry(4 * zoom, 5 * zoom, 3 * zoom),
    new THREE.MeshLambertMaterial({ color: beakColor, flatShading: true })
  );
  beak.position.set(0, 16 * zoom, 24.5 * zoom);
  figure.add(beak);

  const wattle = new THREE.Mesh(
    new THREE.BoxBufferGeometry(2 * zoom, 2.4 * zoom, 3 * zoom),
    new THREE.MeshLambertMaterial({ color: combColor, flatShading: true })
  );
  wattle.position.set(0, 14.5 * zoom, 21.5 * zoom);
  figure.add(wattle);

  const comb = new THREE.Mesh(
    new THREE.BoxBufferGeometry(2.2 * zoom, 6 * zoom, 5 * zoom),
    new THREE.MeshLambertMaterial({ color: combColor, flatShading: true })
  );
  comb.position.set(0, 9 * zoom, 33 * zoom);
  figure.add(comb);

  const combTip = new THREE.Mesh(
    new THREE.BoxBufferGeometry(2.2 * zoom, 3 * zoom, 3 * zoom),
    new THREE.MeshLambertMaterial({ color: 0xff4d6d, flatShading: true })
  );
  combTip.position.set(0, 12 * zoom, 35 * zoom);
  figure.add(combTip);

  const eyeGeo = new THREE.BoxBufferGeometry(2.4 * zoom, 1.4 * zoom, 2.4 * zoom);
  const eyeMat = new THREE.MeshLambertMaterial({
    color: eyeColor,
    flatShading: true,
  });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-5.2 * zoom, 13.2 * zoom, 28 * zoom);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(5.2 * zoom, 13.2 * zoom, 28 * zoom);
  figure.add(leftEye, rightEye);

  const shineGeo = new THREE.BoxBufferGeometry(1 * zoom, 0.7 * zoom, 1 * zoom);
  const shineMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    flatShading: true,
  });
  const leftShine = new THREE.Mesh(shineGeo, shineMat);
  leftShine.position.set(-5.6 * zoom, 13.6 * zoom, 29 * zoom);
  const rightShine = new THREE.Mesh(shineGeo, shineMat);
  rightShine.position.set(4.8 * zoom, 13.6 * zoom, 29 * zoom);
  figure.add(leftShine, rightShine);

  const wingMat = new THREE.MeshPhongMaterial({
    color: cream,
    flatShading: true,
  });
  const leftWing = new THREE.Mesh(
    new THREE.BoxBufferGeometry(3.2 * zoom, 10 * zoom, 8 * zoom),
    wingMat
  );
  leftWing.position.set(-9 * zoom, 0, 16 * zoom);
  leftWing.castShadow = true;
  const rightWing = new THREE.Mesh(
    new THREE.BoxBufferGeometry(3.2 * zoom, 10 * zoom, 8 * zoom),
    wingMat.clone()
  );
  rightWing.position.set(9 * zoom, 0, 16 * zoom);
  rightWing.castShadow = true;
  figure.add(leftWing, rightWing);

  const tail = new THREE.Mesh(
    new THREE.BoxBufferGeometry(8 * zoom, 4 * zoom, 8 * zoom),
    new THREE.MeshPhongMaterial({ color: cream, flatShading: true })
  );
  tail.position.set(0, -11 * zoom, 20 * zoom);
  tail.rotation.x = 0.35;
  figure.add(tail);

  const tailTip = new THREE.Mesh(
    new THREE.BoxBufferGeometry(5 * zoom, 3 * zoom, 5 * zoom),
    new THREE.MeshPhongMaterial({ color: white, flatShading: true })
  );
  tailTip.position.set(0, -14 * zoom, 24 * zoom);
  figure.add(tailTip);

  const legMat = new THREE.MeshLambertMaterial({
    color: legColor,
    flatShading: true,
  });
  const leftLeg = new THREE.Mesh(
    new THREE.BoxBufferGeometry(2.4 * zoom, 2.4 * zoom, 8 * zoom),
    legMat
  );
  leftLeg.position.set(-4 * zoom, 2 * zoom, 6 * zoom);
  const rightLeg = new THREE.Mesh(
    new THREE.BoxBufferGeometry(2.4 * zoom, 2.4 * zoom, 8 * zoom),
    legMat
  );
  rightLeg.position.set(4 * zoom, 2 * zoom, 6 * zoom);
  figure.add(leftLeg, rightLeg);

  const leftFoot = new THREE.Mesh(
    new THREE.BoxBufferGeometry(4.2 * zoom, 6.5 * zoom, 1.6 * zoom),
    legMat
  );
  leftFoot.position.set(-4 * zoom, 4.2 * zoom, 2 * zoom);
  const rightFoot = new THREE.Mesh(
    new THREE.BoxBufferGeometry(4.2 * zoom, 6.5 * zoom, 1.6 * zoom),
    legMat
  );
  rightFoot.position.set(4 * zoom, 4.2 * zoom, 2 * zoom);
  figure.add(leftFoot, rightFoot);

  chicken.userData = {
    figure,
    body,
    head,
    leftWing,
    rightWing,
    tail,
    comb,
  };

  return chicken;
}

function resetChickenPose() {
  const { figure, body, leftWing, rightWing, tail } = chicken.userData;
  figure.position.z = 0;
  body.scale.set(1, 1, 1);
  leftWing.rotation.y = 0;
  rightWing.rotation.y = 0;
  tail.rotation.x = 0.35;
}

function lerpAngle(current, target, amount) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * amount;
}

function animateChicken(timestamp, jumping, jumpProgress) {
  const { figure, body, leftWing, rightWing, tail, comb } = chicken.userData;
  const t = timestamp / 1000;

  if (!jumping) {
    const bob = Math.sin(t * 6) * 1.4 * zoom;
    figure.position.z = bob;
    leftWing.rotation.y = Math.sin(t * 6) * 0.18;
    rightWing.rotation.y = -Math.sin(t * 6) * 0.18;
    tail.rotation.x = 0.35 + Math.sin(t * 4) * 0.1;
    comb.rotation.z = Math.sin(t * 5) * 0.08;
    body.scale.set(1, 1, 1);
    return;
  }

  const flap = Math.sin(jumpProgress * Math.PI * 2) * 0.75;
  const stretch = 1 + Math.sin(jumpProgress * Math.PI) * 0.12;
  figure.position.z = 0;
  leftWing.rotation.y = flap;
  rightWing.rotation.y = -flap;
  tail.rotation.x = 0.2 + jumpProgress * 0.35;
  body.scale.set(1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch), stretch);
}

function Road() {
  const road = new THREE.Group();

  const createSection = (color) =>
    new THREE.Mesh(
      new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
      new THREE.MeshPhongMaterial({ color })
    );

  const middle = createSection(0x454a59);
  middle.receiveShadow = true;
  road.add(middle);

  const left = createSection(0x393d49);
  left.position.x = -boardWidth * zoom;
  road.add(left);

  const right = createSection(0x393d49);
  right.position.x = boardWidth * zoom;
  road.add(right);

  return road;
}

function Grass() {
  const grass = new THREE.Group();

  const createSection = (color) =>
    new THREE.Mesh(
      new THREE.BoxBufferGeometry(
        boardWidth * zoom,
        positionWidth * zoom,
        3 * zoom
      ),
      new THREE.MeshPhongMaterial({ color })
    );

  const middle = createSection(0xbaf455);
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSection(0x99c846);
  left.position.x = -boardWidth * zoom;
  grass.add(left);

  const right = createSection(0x99c846);
  right.position.x = boardWidth * zoom;
  grass.add(right);

  grass.position.z = 1.5 * zoom;
  return grass;
}

function Lane(index) {
  this.index = index;
  this.type =
    index <= 0
      ? "field"
      : laneTypes[Math.floor(Math.random() * laneTypes.length)];

  switch (this.type) {
    case "field": {
      this.type = "field";
      this.mesh = new Grass();
      break;
    }
    case "forest": {
      this.mesh = new Grass();

      this.occupiedPositions = new Set();
      this.threes = [1, 2, 3, 4].map(() => {
        const three = new Three();
        let position;
        do {
          position = Math.floor(Math.random() * columns);
        } while (this.occupiedPositions.has(position));
        this.occupiedPositions.add(position);
        three.position.x =
          (position * positionWidth + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2;
        this.mesh.add(three);
        return three;
      });
      break;
    }
    case "car": {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1, 2, 3].map(() => {
        const vechicle = new Car();
        let position;
        do {
          position = Math.floor((Math.random() * columns) / 2);
        } while (occupiedPositions.has(position));
        occupiedPositions.add(position);
        vechicle.position.x =
          (position * positionWidth * 2 + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
    case "truck": {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1, 2].map(() => {
        const vechicle = new Truck();
        let position;
        do {
          position = Math.floor((Math.random() * columns) / 3);
        } while (occupiedPositions.has(position));
        occupiedPositions.add(position);
        vechicle.position.x =
          (position * positionWidth * 3 + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2;
        if (!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
  }
}

function hideHint() {
  if (hintHidden || !hintDOM) return;
  hintHidden = true;
  hintDOM.classList.add("hidden");
}

document.querySelector("#retry").addEventListener("click", () => {
  initaliseValues();
  endDOM.style.visibility = "hidden";
});

document
  .getElementById("forward")
  .addEventListener("click", () => move("forward"));

document
  .getElementById("backward")
  .addEventListener("click", () => move("backward"));

document.getElementById("left").addEventListener("click", () => move("left"));

document.getElementById("right").addEventListener("click", () => move("right"));

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.keyCode == "38") {
    event.preventDefault();
    move("forward");
  } else if (event.key === "ArrowDown" || event.keyCode == "40") {
    event.preventDefault();
    move("backward");
  } else if (event.key === "ArrowLeft" || event.keyCode == "37") {
    event.preventDefault();
    move("left");
  } else if (event.key === "ArrowRight" || event.keyCode == "39") {
    event.preventDefault();
    move("right");
  }
});

let touchStartX = 0;
let touchStartY = 0;
let touchOnControl = false;

function isControlTarget(target) {
  return Boolean(target && target.closest && target.closest("#controlls, #end"));
}

window.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchOnControl = isControlTarget(event.target);
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (event) => {
    if (!touchOnControl) event.preventDefault();
  },
  { passive: false }
);

window.addEventListener(
  "touchend",
  (event) => {
    if (touchOnControl || gameOver) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 28 && absY < 28) return;
    if (absY > absX) {
      move(dy < 0 ? "forward" : "backward");
    } else {
      move(dx < 0 ? "left" : "right");
    }
  },
  { passive: true }
);

function move(direction) {
  if (gameOver) return;
  hideHint();

  const finalPositions = moves.reduce(
    (position, move) => {
      if (move === "forward")
        return { lane: position.lane + 1, column: position.column };
      if (move === "backward")
        return { lane: position.lane - 1, column: position.column };
      if (move === "left")
        return { lane: position.lane, column: position.column - 1 };
      if (move === "right")
        return { lane: position.lane, column: position.column + 1 };
    },
    { lane: currentLane, column: currentColumn }
  );

  if (direction === "forward") {
    if (
      lanes[finalPositions.lane + 1] &&
      lanes[finalPositions.lane + 1].type === "forest" &&
      lanes[finalPositions.lane + 1].occupiedPositions.has(
        finalPositions.column
      )
    )
      return;
    if (!stepStartTimestamp) startMoving = true;
    addLane();
  } else if (direction === "backward") {
    if (finalPositions.lane === 0) return;
    if (
      lanes[finalPositions.lane - 1].type === "forest" &&
      lanes[finalPositions.lane - 1].occupiedPositions.has(
        finalPositions.column
      )
    )
      return;
    if (!stepStartTimestamp) startMoving = true;
  } else if (direction === "left") {
    if (finalPositions.column === 0) return;
    if (
      lanes[finalPositions.lane].type === "forest" &&
      lanes[finalPositions.lane].occupiedPositions.has(
        finalPositions.column - 1
      )
    )
      return;
    if (!stepStartTimestamp) startMoving = true;
  } else if (direction === "right") {
    if (finalPositions.column === columns - 1) return;
    if (
      lanes[finalPositions.lane].type === "forest" &&
      lanes[finalPositions.lane].occupiedPositions.has(
        finalPositions.column + 1
      )
    )
      return;
    if (!stepStartTimestamp) startMoving = true;
  }
  targetRotationZ = facingAngles[direction];
  moves.push(direction);
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  if (!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  // Animate cars and trucks moving on the lane
  lanes.forEach((lane, laneIndex) => {
    if (lane.type === "car" || lane.type === "truck") {
      const aBitBeforeTheBeginingOfLane =
        (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom;
      const aBitAfterTheEndOFLane =
        (boardWidth * zoom) / 2 + positionWidth * 2 * zoom;
      lane.vechicles.forEach((vechicle) => {
        if (lane.direction) {
          vechicle.position.x =
            vechicle.position.x < aBitBeforeTheBeginingOfLane
              ? aBitAfterTheEndOFLane
              : (vechicle.position.x -= (lane.speed / 16) * delta);
        } else {
          vechicle.position.x =
            vechicle.position.x > aBitAfterTheEndOFLane
              ? aBitBeforeTheBeginingOfLane
              : (vechicle.position.x += (lane.speed / 16) * delta);
        }
      });
    }

    if (lane.type === "forest" && lane.threes) {
      lane.threes.forEach((tree, treeIndex) => {
        tree.rotation.x =
          Math.sin(timestamp / 700 + laneIndex + treeIndex) * 0.035;
      });
    }
  });

  if (startMoving) {
    stepStartTimestamp = timestamp;
    startMoving = false;
  }

  const jumping = Boolean(stepStartTimestamp);
  const jumpProgress = jumping
    ? Math.min((timestamp - stepStartTimestamp) / stepTime, 1)
    : 0;
  animateChicken(timestamp, jumping, jumpProgress);
  chicken.rotation.z = lerpAngle(chicken.rotation.z, targetRotationZ, 0.22);

  if (stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance =
      Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;
    const jumpDeltaDistance =
      Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;
    switch (moves[0]) {
      case "forward": {
        const positionY =
          currentLane * positionWidth * zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        chicken.position.y = positionY; // initial chicken position is 0

        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case "backward": {
        const positionY =
          currentLane * positionWidth * zoom - moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        chicken.position.y = positionY;

        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case "left": {
        const positionX =
          (currentColumn * positionWidth + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2 -
          moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        chicken.position.x = positionX; // initial chicken position is 0
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case "right": {
        const positionX =
          (currentColumn * positionWidth + positionWidth / 2) * zoom -
          (boardWidth * zoom) / 2 +
          moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        chicken.position.x = positionX;

        chicken.position.z = jumpDeltaDistance;
        break;
      }
    }
    // Once a step has ended
    if (moveDeltaTime > stepTime) {
      switch (moves[0]) {
        case "forward": {
          currentLane++;
          counterDOM.innerHTML = currentLane;
          break;
        }
        case "backward": {
          currentLane--;
          counterDOM.innerHTML = currentLane;
          break;
        }
        case "left": {
          currentColumn--;
          break;
        }
        case "right": {
          currentColumn++;
          break;
        }
      }
      moves.shift();
      // If more steps are to be taken then restart counter otherwise stop stepping
      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // Hit test
  if (
    !gameOver &&
    (lanes[currentLane].type === "car" || lanes[currentLane].type === "truck")
  ) {
    const chickenMinX = chicken.position.x - (chickenSize * zoom) / 2;
    const chickenMaxX = chicken.position.x + (chickenSize * zoom) / 2;
    const vechicleLength = { car: 60, truck: 105 }[lanes[currentLane].type];
    lanes[currentLane].vechicles.forEach((vechicle) => {
      const carMinX = vechicle.position.x - (vechicleLength * zoom) / 2;
      const carMaxX = vechicle.position.x + (vechicleLength * zoom) / 2;
      if (chickenMaxX > carMinX && chickenMinX < carMaxX) {
        gameOver = true;
        endDOM.style.visibility = "visible";
      }
    });
  }
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
