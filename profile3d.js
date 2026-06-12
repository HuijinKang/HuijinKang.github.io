// profile3d.js — 프로필 3D 캐릭터 (Three.js, ES 모듈)
// CC0 모델: three.js 예제의 RobotExpressive (로컬 저장, 핫링크 X)
// 인터랙션: 커서 따라 시선 회전 · 클릭 시 랜덤 리액션 · 테마 연동 조명
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// RobotExpressive — 내장 애니메이션: Idle / Wave / Jump / ThumbsUp / Yes / No / Punch / Dance 등
const MODEL_URL = "./assets/models/RobotExpressive.glb";
const EMOTES = ["Wave", "Jump", "ThumbsUp", "Yes", "Punch", "Dance"];
const GREETING = "Wave"; // 입장 시 손 흔들기

const stage = document.getElementById("robot-stage");
if (stage) init(stage);

function prefersReducedMotion() {
  return window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

// 모델/WebGL 실패 시: 무대를 접고 아바타 이미지로 폴백
function showFallback() {
  stage.innerHTML = "";
  const p = (typeof profile === "object" && profile) || {};
  if (p.avatar) {
    const img = document.createElement("img");
    img.className = "stage-fallback";
    img.src = p.avatar;
    img.alt = (p.name || "") + " avatar";
    img.onerror = () => { stage.style.display = "none"; };
    stage.appendChild(img);
  } else {
    stage.style.display = "none";
  }
}

function init(stage) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    showFallback();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // 로봇 키(~4.5) 기준, 전신(머리 포함)이 잘리지 않는 프레이밍
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.6, 8.6);
  camera.lookAt(0, 2.05, 0);

  // 조명 — 테마에 따라 강도/색을 바꾼다
  const hemi = new THREE.HemisphereLight(0xffffff, 0xddddcc, 1.6);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 5);
  scene.add(key);

  // 다크모드용 그린 림 라이트 (계측기 톤)
  const rim = new THREE.DirectionalLight(0x4bc468, 0);
  rim.position.set(-4, 3, -4);
  scene.add(rim);

  function applyTheme() {
    if (isDark()) {
      hemi.intensity = 0.55;
      hemi.color.set(0xbfd4ff);
      key.intensity = 1.1;
      key.color.set(0xcfe8ff);
      rim.intensity = 2.4;
    } else {
      hemi.intensity = 1.6;
      hemi.color.set(0xffffff);
      key.intensity = 2.2;
      key.color.set(0xffffff);
      rim.intensity = 0;
    }
  }
  applyTheme();

  // 테마 토글 감지 (app.js와 결합 없이 attribute 관찰)
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-theme"]
  });

  // ----- 모델 로드 -----
  let robot = null;
  let mixer = null;
  let idleAction = null;
  const actions = {};
  let emoting = false;

  new GLTFLoader().load(MODEL_URL, (gltf) => {
    robot = gltf.scene;
    robot.position.set(0, 0, 0);
    scene.add(robot);

    mixer = new THREE.AnimationMixer(robot);
    gltf.animations.forEach((clip) => {
      actions[clip.name] = mixer.clipAction(clip);
      // 대기 동작은 모델마다 이름이 달라(Idle/idle) 대소문자 무시로 찾는다
      if (clip.name.toLowerCase() === "idle") idleAction = actions[clip.name];
    });

    if (idleAction) idleAction.play();

    // 입장 인사: 모션 허용 시 한 번 재생
    if (!prefersReducedMotion() && actions[GREETING]) {
      setTimeout(() => playEmote(GREETING), 600);
    }
  }, undefined, showFallback);

  // 리액션 재생: idle → emote(1회) → idle 크로스페이드
  function playEmote(name) {
    const action = actions[name];
    if (!action || !idleAction || emoting) return;
    emoting = true;

    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    idleAction.crossFadeTo(action, 0.25, false);
    action.play();

    const onFinished = (e) => {
      if (e.action !== action) return;
      mixer.removeEventListener("finished", onFinished);
      idleAction.reset();
      action.crossFadeTo(idleAction, 0.25, false);
      idleAction.play();
      emoting = false;
    };
    mixer.addEventListener("finished", onFinished);
  }

  // 클릭/탭 → 랜덤 리액션
  stage.addEventListener("click", () => {
    if (prefersReducedMotion()) return;
    const pool = EMOTES.filter((n) => actions[n]);
    if (pool.length === 0) return;
    playEmote(pool[Math.floor(Math.random() * pool.length)]);
  });

  // 커서 추적 (창 전체 기준 → 로봇이 마우스를 쳐다봄)
  const target = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;   // -1 ~ 1
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // ----- 사이즈/렌더 루프 -----
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    if (mixer) mixer.update(dt);

    if (robot && !prefersReducedMotion()) {
      // 부드럽게 커서 방향으로 회전 (절제된 범위)
      robot.rotation.y += (target.x * 0.55 - robot.rotation.y) * 0.08;
      robot.rotation.x += (target.y * 0.12 - robot.rotation.x) * 0.08;
    }
    renderer.render(scene, camera);
  });
}
