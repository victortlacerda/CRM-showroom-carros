// Duas câmeras (D09): "diorama" (isométrica com limites) e "orbital" (livre) + atalhos de foco por zona.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const PRESETS = {
  geral: { nome: 'Visão geral', alvo: [-4, 0, -12], dist: 178, polar: 0.9, az: 0.06 },
  loja: { nome: 'Loja', alvo: [12, 1, -4], dist: 108, polar: 0.88, az: 0.08 },
  showroom: { nome: 'Showroom', alvo: [6, 0, -6], dist: 50, polar: 0.82, az: 0.05 },
  escritorio: { nome: 'Escritório', alvo: [-25, 5, -6], dist: 36, polar: 0.8, az: 0.12 },
  oficina: { nome: 'Oficina', alvo: [36, 0, -6], dist: 40, polar: 0.82, az: -0.05 },
  lavajato: { nome: 'Lava-jato', alvo: [53, 0, -6], dist: 34, polar: 0.82, az: -0.1 },
  patio: { nome: 'Pátio', alvo: [-56, 0, -18], dist: 78, polar: 0.9, az: 0.12 },
  avaliacao: { nome: 'Avaliação', alvo: [70, 0, 0], dist: 36, polar: 0.85, az: -0.25 },
  calcada: { nome: 'Calçada', alvo: [6, 0, 10], dist: 46, polar: 1.0, az: 0.0 },
};

const suave = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class Camaras {
  constructor(camera, canvas) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.zoomSpeed = 0.9;
    this.modo = 'diorama';
    this.anim = null;
    this.presetAtual = 'loja';
    this.irPara('loja', true);
    this.aplicarModo();
  }

  aplicarModo() {
    const c = this.controls;
    if (this.modo === 'diorama') {
      c.minAzimuthAngle = -0.75; c.maxAzimuthAngle = 0.75;
      c.minPolarAngle = 0.25; c.maxPolarAngle = 1.2;
      c.minDistance = 14; c.maxDistance = 230;
      c.enableRotate = true;
    } else {
      c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity;
      c.minPolarAngle = 0.05; c.maxPolarAngle = 1.52;
      c.minDistance = 6; c.maxDistance = 300;
    }
  }
  alternarModo() {
    this.modo = this.modo === 'diorama' ? 'orbital' : 'diorama';
    this.aplicarModo();
    if (this.modo === 'diorama') this.irPara(this.presetAtual || 'loja');
    return this.modo;
  }

  _esfericas() {
    const off = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    const s = new THREE.Spherical().setFromVector3(off);
    return { alvo: this.controls.target.clone(), r: s.radius, polar: s.phi, az: s.theta };
  }

  irPara(nome, instantaneo = false) {
    const p = PRESETS[nome]; if (!p) return;
    this.presetAtual = nome;
    this.focarEm(new THREE.Vector3(...p.alvo), p.dist, p.polar, p.az, instantaneo);
  }

  /** Foca em um ponto (ex.: carro clicado) sem mudar o ângulo, a menos que informado. */
  focarEm(alvo, dist, polar, az, instantaneo = false) {
    const de = this._esfericas();
    const para = { alvo: alvo.clone(), r: dist ?? de.r, polar: polar ?? de.polar, az: az ?? de.az };
    if (instantaneo) { this._aplicar(para); this.anim = null; return; }
    this.anim = { de, para, t: 0, dur: 1.15 };
  }

  _aplicar({ alvo, r, polar, az }) {
    this.controls.target.copy(alvo);
    const s = new THREE.Spherical(r, polar, az);
    this.camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(alvo));
    this.camera.lookAt(alvo);
  }

  atualizar(dt) {
    if (this.anim) {
      const a = this.anim; a.t += dt; const k = suave(Math.min(1, a.t / a.dur));
      const l = (x, y) => x + (y - x) * k;
      this._aplicar({
        alvo: new THREE.Vector3().lerpVectors(a.de.alvo, a.para.alvo, k),
        r: l(a.de.r, a.para.r), polar: l(a.de.polar, a.para.polar), az: l(a.de.az, a.para.az),
      });
      if (a.t >= a.dur) this.anim = null;
    }
    this.controls.update();
  }
  /** O usuário mexeu na câmera → cancela a animação. */
  interromper() { this.anim = null; }
}
