"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import styles from "./stash-example.module.css";

// Stash geometry, hinge, camera targets and lid damping from SHD Network
// a2362a1: StashBox.tsx, useCameraRig.ts and threeConfig.ts.
// This excerpt omits route changes, database loading and the full navigation UI.
function disposeObject(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points))
      return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
  });
  textures.forEach((texture) => {
    texture.dispose();
    const image = texture.source.data;
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
      image.close();
  });
}

export default function StashScene() {
  const host = useRef<HTMLButtonElement>(null);
  const replay = useRef<((animate: boolean) => void) | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    "loading" | "playing" | "open" | "closed" | "error"
  >("loading");

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      queueMicrotask(() => {
        if (!disposed) setStatus("error");
      });
      return () => {
        disposed = true;
      };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050607);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "Animated SHD stash: the camera approaches as the case lid opens.",
    );
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const lookAt = new THREE.Vector3(0, 0.8, 0);
    camera.position.set(0, 1.5, 6);
    camera.lookAt(lookAt);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));
    const light = new THREE.SpotLight(0xffffff, 200, 15, 0.3, 0.5, 1.5);
    light.position.set(0.4, 8, 1.5);
    light.target.position.set(0, 0.6, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.0002;
    scene.add(light, light.target);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const points: number[] = [];
    for (let x = -25; x <= 25; x++)
      for (let z = -25; z <= 25; z++) points.push(x * 0.85, 0.015, z * 0.85);
    const dots = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      ),
      new THREE.PointsMaterial({
        color: 0xff6d10,
        size: 0.025,
        transparent: true,
        opacity: 0.5,
      }),
    );
    scene.add(dots);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.9, -0.4);
    scene.add(pivot);
    const draw = () => {
      if (!disposed) renderer.render(scene, camera);
    };
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      // Preserve enough horizontal room for the case on narrow screens.
      camera.fov = THREE.MathUtils.radToDeg(
        2 *
          Math.atan(
            Math.tan(THREE.MathUtils.degToRad(55 / 2)) *
              Math.max(1, 1.55 / camera.aspect),
          ),
      );
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const openAngle = -Math.PI * 0.7;
    const play = (animate: boolean) => {
      cancelAnimationFrame(frame);
      pivot.rotation.x = 0;
      camera.position.set(0, 1.5, 6);
      lookAt.set(0, 0.8, 0);
      camera.lookAt(lookAt);
      if (!animate) {
        setStatus("closed");
        draw();
        return;
      }
      if (media.matches) {
        pivot.rotation.x = openAngle;
        camera.position.set(0, 2, 1.5);
        lookAt.set(0, 0.75, -0.5);
        camera.lookAt(lookAt);
        setStatus("open");
        draw();
        return;
      }
      setStatus("playing");
      const begun = performance.now();
      let previous = begun;
      const target = new THREE.Vector3();
      const targetLook = new THREE.Vector3();
      const tick = (now: number) => {
        if (disposed) return;
        const elapsed = (now - begun) / 1000;
        const delta = Math.min((now - previous) / 1000, 0.05);
        previous = now;
        const opening = elapsed > 0.7;
        target.set(0, opening ? 2 : 1, opening ? 1.5 : 2.2);
        targetLook.set(0, opening ? 0.75 : 0.6, opening ? -0.5 : 0);
        const cameraFactor =
          1 - Math.pow(1 - (opening ? 0.3 : 0.35), delta * 60);
        camera.position.lerp(target, cameraFactor);
        lookAt.lerp(targetLook, cameraFactor);
        camera.lookAt(lookAt);
        if (opening)
          pivot.rotation.x = THREE.MathUtils.lerp(
            pivot.rotation.x,
            openAngle,
            1 - Math.pow(0.001, delta * 0.6),
          );
        draw();
        if (elapsed < 3) frame = requestAnimationFrame(tick);
        else {
          pivot.rotation.x = openAngle;
          draw();
          setStatus("open");
        }
      };
      frame = requestAnimationFrame(tick);
    };
    const loader = new GLTFLoader();
    async function load(url: string, parent: THREE.Object3D, lid = false) {
      const gltf = await loader.loadAsync(url);
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }
      gltf.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      if (lid) gltf.scene.position.set(0, -0.9, 0.4);
      parent.add(gltf.scene);
    }
    Promise.all([
      load("/models/shd/stash_body.glb", scene),
      load("/models/shd/stash_lid.glb", pivot, true),
    ])
      .then(() => {
        if (!disposed) {
          replay.current = play;
          play(false);
        }
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });
    return () => {
      disposed = true;
      replay.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposeObject(scene);
      light.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [attempt]);

  return (
    <>
      <button
        ref={host}
        type="button"
        className={`${styles.scene} ${styles.sceneButton}`}
        aria-label={
          status === "closed" ? "Open stash" : "Replay stash animation"
        }
        disabled={
          status === "loading" || status === "playing" || status === "error"
        }
        onClick={() => replay.current?.(true)}
      />
      {status === "loading" && (
        <div className={styles.loading} role="status">
          Loading stash…
        </div>
      )}
      {status === "error" ? (
        <div className={styles.loading} role="alert">
          The 3D preview couldn’t load.{" "}
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className={styles.controls}>
          <button
            type="button"
            disabled={status === "loading" || status === "closed"}
            onClick={() => replay.current?.(false)}
          >
            Reset
          </button>
          <span className="sr-only" role="status">
            {status === "playing"
              ? "Opening stash"
              : status === "open"
                ? "Stash open"
                : status === "closed"
                  ? "Stash closed"
                  : ""}
          </span>
        </div>
      )}
    </>
  );
}
