// Efeitos visuais: confete de venda, ícones de status sobre a cabeça, aura de assinatura.
import * as THREE from 'three';

// ---------- Confete ----------
const CORES = [0xffd166, 0xef476f, 0x06d6a0, 0x118ab2, 0xf78c6b, 0xffffff];
export class Confete {
  constructor(scene, max = 240) {
    this.max = max;
    this.malha = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.02, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }), max);
    this.malha.frustumCulled = false; this.malha.count = 0;
    this.p = []; scene.add(this.malha);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(1, 1, 1);
    this._c = new THREE.Color();
  }
  explodir(x, y, z, n = 90) {
    for (let i = 0; i < n && this.p.length < this.max; i++) {
      const a = Math.random() * Math.PI * 2, f = 2 + Math.random() * 5;
      this.p.push({ x, y, z, vx: Math.cos(a) * f, vy: 5 + Math.random() * 6, vz: Math.sin(a) * f, rx: Math.random() * 6, ry: Math.random() * 6, vr: (Math.random() - 0.5) * 14, vida: 2.6 + Math.random() * 1.4, cor: CORES[i % CORES.length] });
    }
  }
  atualizar(dt) {
    let n = 0;
    this.p = this.p.filter((q) => (q.vida -= dt) > 0 && q.y > -0.1);
    for (const q of this.p) {
      q.vy -= 12 * dt; q.vx *= 0.99; q.vz *= 0.99;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rx += q.vr * dt; q.ry += q.vr * 0.7 * dt;
      this._q.setFromEuler(this._e.set(q.rx, q.ry, 0));
      this._m.compose(new THREE.Vector3(q.x, Math.max(q.y, 0.1), q.z), this._q, this._s);
      this.malha.setMatrixAt(n, this._m); this.malha.setColorAt(n, this._c.setHex(q.cor)); n++;
    }
    this.malha.count = n; this.malha.instanceMatrix.needsUpdate = true;
    if (this.malha.instanceColor) this.malha.instanceColor.needsUpdate = true;
  }
}

// ---------- Ícones (desenhados em canvas, sem depender de emoji) ----------
const cacheIcones = new Map();
function desenhar(tipo) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const disco = (cor) => { x.fillStyle = cor; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill(); x.lineWidth = 6; x.strokeStyle = '#fff'; x.stroke(); };
  x.lineCap = 'round'; x.lineJoin = 'round';
  switch (tipo) {
    case 'alerta': // triângulo vermelho com "!"
      x.fillStyle = '#e5484d'; x.strokeStyle = '#fff'; x.lineWidth = 7;
      x.beginPath(); x.moveTo(64, 10); x.lineTo(120, 112); x.lineTo(8, 112); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#fff'; x.fillRect(58, 42, 12, 38); x.beginPath(); x.arc(64, 96, 7, 0, 7); x.fill(); break;
    case 'agenda': // calendário
      disco('#2f6fed'); x.fillStyle = '#fff'; x.fillRect(34, 38, 60, 52); x.fillStyle = '#2f6fed'; x.fillRect(34, 38, 60, 14);
      x.fillStyle = '#2f6fed'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) x.fillRect(42 + i * 16, 60 + j * 14, 10, 8); break;
    case 'assinar': // caneta sobre documento
      disco('#f5a524'); x.fillStyle = '#fff'; x.fillRect(34, 32, 44, 58); x.strokeStyle = '#f5a524'; x.lineWidth = 5;
      x.beginPath(); x.moveTo(42, 46); x.lineTo(70, 46); x.moveTo(42, 58); x.lineTo(70, 58); x.stroke();
      x.strokeStyle = '#1a1e26'; x.lineWidth = 9; x.beginPath(); x.moveTo(60, 92); x.lineTo(96, 52); x.stroke(); break;
    case 'docs': // documento
      disco('#7b61ff'); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(40, 30); x.lineTo(72, 30); x.lineTo(90, 48); x.lineTo(90, 98); x.lineTo(40, 98); x.closePath(); x.fill();
      x.strokeStyle = '#7b61ff'; x.lineWidth = 5; x.beginPath(); x.moveTo(48, 62); x.lineTo(82, 62); x.moveTo(48, 76); x.lineTo(82, 76); x.stroke(); break;
    case 'venda': // estrela
      disco('#2ec27e'); x.fillStyle = '#fff'; x.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 36, a = -Math.PI / 2 + (i * Math.PI) / 5; x.lineTo(64 + Math.cos(a) * r, 66 + Math.sin(a) * r); }
      x.closePath(); x.fill(); break;
    default: break;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function criarIcone(tipo) {
  if (!cacheIcones.has(tipo)) cacheIcones.set(tipo, new THREE.SpriteMaterial({ map: desenhar(tipo), transparent: true, depthWrite: false }));
  const s = new THREE.Sprite(cacheIcones.get(tipo)); s.scale.set(0.95, 0.95, 1); s.renderOrder = 12; return s;
}

// ---------- Anéis de urgência (sob os pés dos clientes) ----------
const matAnel = {
  ok: new THREE.MeshBasicMaterial({ color: 0x2ec27e, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  atencao: new THREE.MeshBasicMaterial({ color: 0xf5a524, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
  atrasado: new THREE.MeshBasicMaterial({ color: 0xe5484d, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
  nenhum: new THREE.MeshBasicMaterial({ color: 0x9aa3b2, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
};
const geoAnel = new THREE.RingGeometry(0.42, 0.58, 24);
export function criarAnelUrgencia() {
  const m = new THREE.Mesh(geoAnel, matAnel.ok); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.renderOrder = 4; return m;
}
export const materialAnel = matAnel;

// ---------- Aura de assinatura (brilho dourado pulsante no chão) ----------
export function criarAura() {
  const g = new THREE.Group();
  const disco = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), new THREE.MeshBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0.35, depthWrite: false }));
  disco.rotation.x = -Math.PI / 2; disco.position.y = 0.05; disco.renderOrder = 3;
  const anel = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.55, 32), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.06; anel.renderOrder = 4;
  g.add(disco, anel); g.userData = { disco, anel };
  return g;
}
export function pulsarAura(g, t) {
  const k = 0.5 + 0.5 * Math.sin(t * 3);
  g.userData.disco.material.opacity = 0.25 + 0.25 * k; g.userData.anel.scale.setScalar(0.9 + 0.15 * k);
}
