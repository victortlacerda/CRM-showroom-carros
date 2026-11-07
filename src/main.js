import * as THREE from 'three';
import { construirCenario } from './cena/cenario.js';
import { Carros } from './cena/carros.js';
import { Camaras } from './cena/camaras.js';
import { Clima } from './cena/clima.js';
import { Agentes } from './cena/agentes.js';
import { UI } from './ui/ui.js';
import { Transito } from './cena/transito.js';
import { JsonSource } from './dados/DataSource.js';
import { Loja } from './regras/loja.js';

async function iniciar() {
  const canvas = document.getElementById('cena');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe3f5);
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 900);
  const camaras = new Camaras(camera, canvas);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x9bb59a, 1.1);
  scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xfff3dc, 2.2);
  sol.position.set(60, 90, 70);
  sol.castShadow = true;
  sol.shadow.mapSize.set(4096, 4096);
  Object.assign(sol.shadow.camera, { left: -110, right: 100, top: 70, bottom: -75, near: 1, far: 300 });
  sol.shadow.bias = -0.0004;
  scene.add(sol);

  const dados = await new JsonSource().carregar();
  const loja = new Loja(dados);
  const { raiz, luzes } = construirCenario({ nomeLoja: dados.config.nomeLoja });
  scene.add(raiz);
  const clima = new Clima(scene, hemi, sol, luzes, renderer);
  const carros = new Carros(scene, loja);
  const agentes = new Agentes(scene, loja, carros);
  const transito = new Transito(scene);

  const ui = new UI({ canvas, camera, scene, loja, carros, agentes, camaras, clima });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  const relogio = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(relogio.getDelta(), 0.1);
    carros.atualizar(dt, camera); agentes.atualizar(dt); transito.atualizar(dt);
    camaras.atualizar(dt); clima.atualizar();
    renderer.render(scene, camera);
  });
  window.__app = { scene, camera, renderer, camaras, clima, loja, carros, agentes, ui };
}
iniciar();
