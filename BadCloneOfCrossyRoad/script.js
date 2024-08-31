const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
);

const cameraOffset = { x: 10, y: 10, z: 10 };
camera.position.set(cameraOffset.x, cameraOffset.y, cameraOffset.z);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const playerWidth = 1;
const playerHeight = 2;
const cubeGeometry = new THREE.BoxGeometry(playerWidth, playerHeight, playerWidth);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x2196F3 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

const terrainGroup = new THREE.Group();
scene.add(terrainGroup);

const rowWidth = 50; 
const rowDepth = 1;  
const visibleRows = 20; 
const bufferRows = 20;

function createSafeRegion(z) {
    const regionGeometry = new THREE.PlaneGeometry(rowWidth, rowDepth);
    const regionMaterial = new THREE.MeshBasicMaterial({ color: 0x4CAF50, side: THREE.DoubleSide });
    const region = new THREE.Mesh(regionGeometry, regionMaterial);
    region.rotation.x = -Math.PI / 2;
    region.position.set(0, 0, -z);

    for (let i = -rowWidth / 2; i < rowWidth / 2; i += 5) {
        if (Math.random() < 0.3) { 
            const treeX = i + Math.random() * 5 - 2.5;
            const treeZ = z + Math.random() * rowDepth - rowDepth / 2;
            const tree = createTree(treeX, treeZ);
            region.add(tree);
        }
    }

    return region;
}

function createTree(x, z) {
    const trunkGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 0.5, -z);

    const leafHeight = Math.random() < 0.5 ? 1 : 1.5;
    const leavesGeometry = new THREE.ConeGeometry(1, leafHeight, 8);
    const leavesMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(x, 1 + leafHeight / 2, -z);

    const treeGroup = new THREE.Group();
    treeGroup.add(trunk);
    treeGroup.add(leaves);
    return treeGroup;
}

function createWaterRegion(z) {
    const regionGeometry = new THREE.PlaneGeometry(rowWidth, rowDepth);
    const regionMaterial = new THREE.MeshBasicMaterial({ color: 0x4169E1, side: THREE.DoubleSide });
    const region = new THREE.Mesh(regionGeometry, regionMaterial);
    region.rotation.x = -Math.PI / 2;
    region.position.set(0, 0, -z);
    return region;
}

function createRoadRegion(z) {
    const regionGeometry = new THREE.PlaneGeometry(rowWidth, rowDepth);
    const regionMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
    const region = new THREE.Mesh(regionGeometry, regionMaterial);
    region.rotation.x = -Math.PI / 2;
    region.position.set(0, 0, -z);
    return region;
}

function createTrainTrackRegion(z) {
    const regionGeometry = new THREE.PlaneGeometry(rowWidth, rowDepth);
    const regionMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513, side: THREE.DoubleSide });
    const region = new THREE.Mesh(regionGeometry, regionMaterial);
    region.rotation.x = -Math.PI / 2;
    region.position.set(0, 0, -z);

    const railGeometry = new THREE.BoxGeometry(1, 0.1, 0.5); 
    const railMaterial = new THREE.MeshBasicMaterial({ color: 0x696969 });
    const rail1 = new THREE.Mesh(railGeometry, railMaterial);
    const rail2 = new THREE.Mesh(railGeometry, railMaterial);
    rail1.position.set(0, 0.05, -rowDepth / 4);
    rail2.position.set(0, 0.05, rowDepth / 4);
    region.add(rail1);
    region.add(rail2);

    return region;
}

function generateTerrain() {
    const playerZ = cube.position.z;
    const startRow = Math.floor(playerZ / rowDepth);
    const endRow = startRow + visibleRows + bufferRows;

    for (let i = startRow; i <= endRow; i++) {
        const z = i * rowDepth;
        if (!terrainGroup.children.some(child => child.position.z === -z)) {
            const region = createTerrain(z);
            terrainGroup.add(region);
        }
    }

    terrainGroup.children.forEach(child => {
        if (child.position.z > -playerZ + (visibleRows * rowDepth)) {
            terrainGroup.remove(child);
        }
    });
}

function createTerrain(z) {
    let region;
    if (Math.random() < 0.5) {
        region = createSafeRegion(z);
    } else {
        const dangerType = Math.random();
        if (dangerType < 0.33) {
            region = createWaterRegion(z);
        } else if (dangerType < 0.66) {
            region = createRoadRegion(z);
        } else {
            region = createTrainTrackRegion(z);
        }
    }
    return region;
}

function initializePlayer() {
    let initialZ = 0;
    let initialRegion;
    do {
        initialRegion = createSafeRegion(initialZ);
        initialZ += rowDepth;
    } while (initialRegion.position.z > 0);
    terrainGroup.add(initialRegion);
    cube.position.set(0, playerHeight / 2, initialZ - rowDepth / 2);
}

initializePlayer();

let lastMoveTime = Date.now();
let lastPlayerZ = cube.position.z;

document.addEventListener('keydown', (event) => {
    const key = event.key;
    const moveDistance = 1;

    switch (key) {
        case 'w':
            cube.position.z -= moveDistance;
            break;
        case 's':
            cube.position.z += moveDistance; 
            break;
        case 'a':
            cube.position.x -= moveDistance;
            break;
        case 'd':
            cube.position.x += moveDistance;
            break;
    }

    lastMoveTime = Date.now();
    if (cube.position.z > lastPlayerZ) {
        generateTerrain();
    }
    lastPlayerZ = cube.position.z;
});

const threshold = 5;
const cameraFollowSpeed = 0.1;

function updateCamera() {
    const currentTime = Date.now();
    const timeSinceLastMove = currentTime - lastMoveTime;

    let targetX, targetZ;

    if (timeSinceLastMove > 3000) {
        targetX = cube.position.x;
        targetZ = cube.position.z;
    } else {
        const diffX = cube.position.x - (camera.position.x - cameraOffset.x);
        const diffZ = cube.position.z - (camera.position.z - cameraOffset.z);

        targetX = camera.position.x - cameraOffset.x;
        targetZ = camera.position.z - cameraOffset.z;

        if (Math.abs(diffX) > threshold) {
            targetX += diffX - Math.sign(diffX) * threshold;
        }
        if (Math.abs(diffZ) > threshold) {
            targetZ += diffZ - Math.sign(diffZ) * threshold;
        }
    }

    camera.position.x += (targetX + cameraOffset.x - camera.position.x) * cameraFollowSpeed;
    camera.position.z += (targetZ + cameraOffset.z - camera.position.z) * cameraFollowSpeed;
    camera.position.y = cameraOffset.y;
    camera.lookAt(camera.position.x - cameraOffset.x, 0, camera.position.z - cameraOffset.z);
}

function animate() {
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});