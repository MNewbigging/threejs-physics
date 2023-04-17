import * as THREE from "three";
import CANNON from "cannon";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { GameLoader } from "./loaders/game-loader";
import { addGui } from "./utils/utils";

interface PhysicsObject {
  mesh: THREE.Mesh;
  body: CANNON.Body;
}

export class GameState {
  private clock = new THREE.Clock();
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private world: CANNON.World;
  private objects: PhysicsObject[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(-3, 3, 3);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    THREE.ColorManagement.legacyMode = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    window.addEventListener("resize", this.onCanvasResize);
    this.onCanvasResize();

    this.scene.background = new THREE.Color("#1680AF");

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.far = 15;
    directionalLight.shadow.camera.left = -7;
    directionalLight.shadow.camera.top = 7;
    directionalLight.shadow.camera.right = 7;
    directionalLight.shadow.camera.bottom = -7;
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Physics world
    const world = new CANNON.World();
    this.world = world;
    world.gravity.set(0, -9.82, 0);

    // Physics materials
    const defaultMaterial = new CANNON.Material("default");

    world.defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.1,
        restitution: 0.7,
      }
    );

    // Objects
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
      })
    );
    sphere.castShadow = true;
    sphere.position.y = 0.5;

    this.objects.push({
      mesh: sphere,
      body: new CANNON.Body({
        shape: new CANNON.Sphere(0.5),
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
      }),
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({
        color: "#777777",
        metalness: 0.3,
        roughness: 0.4,
      })
    );
    floor.receiveShadow = true;
    floor.rotation.x = -Math.PI * 0.5;

    const floorBody = new CANNON.Body({
      mass: 0, // 0 = static object
      shape: new CANNON.Plane(),
    });
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI * 0.5
    );

    this.objects.push({
      mesh: floor,
      body: floorBody,
    });

    this.objects.forEach((object) => {
      this.scene.add(object.mesh);
      this.world.addBody(object.body);
    });

    // Start game
    this.update();
  }

  private onCanvasResize = () => {
    this.renderer.setSize(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      false
    );

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    this.camera.updateProjectionMatrix();
  };

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    // Run physics world update
    this.world.step(1 / 60, dt, 3);

    // Update objects position according to their physics bodies
    this.objects.forEach((object) => {
      object.mesh.position.x = object.body.position.x;
      object.mesh.position.y = object.body.position.y;
      object.mesh.position.z = object.body.position.z;
    });

    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  };
}
