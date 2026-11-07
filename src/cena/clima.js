// Ciclo dia/noite (D10/D29): horário real do computador, com opção de forçar dia ou noite.
import * as THREE from 'three';

const CHAVES = [ // hora, céu, hemisfério(céu), hemisfério(chão), intensidade hemi, cor sol, intensidade sol
  [0, 0x070b1c, 0x4a5f9e, 0x252c44, 0.95, 0x8fa6ff, 0.7],
  [5, 0x1a2145, 0x5a68a0, 0x2a3148, 0.95, 0x9db0ff, 0.75],
  [6.5, 0xf2a76b, 0xffd2a8, 0x7c6a60, 0.85, 0xffb27a, 1.4],
  [9, 0xbfe3f5, 0xffffff, 0x9bb59a, 1.1, 0xfff3dc, 2.2],
  [15, 0xbfe3f5, 0xffffff, 0x9bb59a, 1.1, 0xfff3dc, 2.2],
  [17.5, 0xf6a56b, 0xffd9b8, 0x8a7a68, 0.9, 0xffb070, 1.6],
  [19, 0x2a2a52, 0x6a6ca8, 0x2d3348, 0.9, 0xc9a1ff, 0.8],
  [21, 0x0b1026, 0x4a5f9e, 0x252c44, 0.95, 0x8fa6ff, 0.7],
  [24, 0x070b1c, 0x4a5f9e, 0x252c44, 0.95, 0x8fa6ff, 0.7],
];
const c1 = new THREE.Color(); const c2 = new THREE.Color();
function mix(a, b, k) { c1.setHex(a); c2.setHex(b); return c1.lerp(c2, k).clone(); }

export class Clima {
  constructor(scene, hemi, sol, luzes, renderer) {
    Object.assign(this, { scene, hemi, sol, luzes, renderer });
    this.modo = 'auto'; // auto | dia | noite
    this.hora = 12;
    this.ouvintes = [];
    scene.fog = new THREE.Fog(0xbfe3f5, 260, 620);
    // luzes pontuais (sem sombra) que acendem à noite
    this.pontos = [[6, 4.2, -6, 36], [36, 4.2, -7, 26], [53, 4.2, -7, 22], [-25, 8.8, -6, 26], [-25, 3.6, -4, 20], [-56, 6, -10, 40]].map(([x, y, z, d]) => {
      const l = new THREE.PointLight(0xffe2a8, 0, d, 1.4); l.position.set(x, y, z); scene.add(l); return l;
    });
    this.atualizar(true);
  }
  horaAtual() {
    if (this.modo === 'dia') return 12;
    if (this.modo === 'noite') return 22;
    const d = new Date(); return d.getHours() + d.getMinutes() / 60;
  }
  setModo(m) { this.modo = m; this.atualizar(true); }
  onMudanca(fn) { this.ouvintes.push(fn); }
  get ehNoite() { return this.hora < 6.2 || this.hora > 18.6; }

  atualizar(forcar = false) {
    const h = this.horaAtual();
    if (!forcar && Math.abs(h - this.hora) < 0.01) return;
    const antesNoite = this.ehNoite;
    this.hora = h;
    let i = 0; while (i < CHAVES.length - 2 && h > CHAVES[i + 1][0]) i++;
    const a = CHAVES[i], b = CHAVES[i + 1];
    const k = Math.min(1, Math.max(0, (h - a[0]) / (b[0] - a[0])));
    const ceu = mix(a[1], b[1], k);
    this.scene.background = ceu; this.scene.fog.color.copy(ceu);
    this.hemi.color.copy(mix(a[2], b[2], k)); this.hemi.groundColor.copy(mix(a[3], b[3], k));
    this.hemi.intensity = a[4] + (b[4] - a[4]) * k;
    this.sol.color.copy(mix(a[5], b[5], k)); this.sol.intensity = a[6] + (b[6] - a[6]) * k;
    // trajetória do sol (6h → 18h); à noite, "lua" do lado oposto e mais baixa
    const dia = h >= 6 && h <= 18;
    const ang = dia ? ((h - 6) / 12) * Math.PI : ((h < 6 ? h + 6 : h - 18) / 12) * Math.PI;
    const alt = Math.sin(ang) * (dia ? 1 : 0.55);
    this.sol.position.set(Math.cos(ang) * -90, 25 + alt * 75, 55);
    // lâmpadas: acendem do entardecer ao amanhecer
    const noite = h < 6 ? 1 : h < 7 ? 1 - (h - 6) : h < 17.5 ? 0 : h < 19 ? (h - 17.5) / 1.5 : 1;
    for (const e of this.luzes.emissivos) e.mat.emissiveIntensity = noite * e.noite;
    if (this.luzes.letreiro) { this.luzes.letreiro.emissiveIntensity = noite * 0.9; }
    this.noiteFator = noite;
    for (const l of this.pontos) l.intensity = noite * 55;
    if (this.ehNoite !== antesNoite || forcar) this.ouvintes.forEach((fn) => fn(this.ehNoite));
  }
}
