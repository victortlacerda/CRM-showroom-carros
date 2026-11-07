// Carros passando na rua (ambiente vivo). Duas faixas, sentidos opostos, voltam ao início ao sair do mapa.
import * as THREE from 'three';
import { criarCarro } from './carros.js';
import { RUA } from './layout.js';

const TIPOS = ['hatch', 'sedan', 'suv', 'picape', 'hatch', 'sedan', 'van'];
const CORES = [0xf2f2f0, 0xb9bec4, 0x1d1f23, 0x2456a6, 0xc0262d, 0x6d737b, 0xd9701f, 0x2f6b4f, 0xe0b82a];
const X0 = -115, X1 = 105;

export class Transito {
  constructor(scene, quantidade = 8) {
    this.raiz = new THREE.Group(); scene.add(this.raiz);
    this.carros = [];
    for (let i = 0; i < quantidade; i++) {
      const sentido = i % 2 ? 1 : -1; // +1 = vai para +x
      const g = criarCarro(TIPOS[i % TIPOS.length], CORES[(i * 3) % CORES.length]);
      g.rotation.y = sentido > 0 ? 0 : Math.PI;
      const z = (sentido > 0 ? RUA.faixaB : RUA.faixaA) + (Math.random() - 0.5) * 0.5;
      const x = X0 + Math.random() * (X1 - X0);
      g.position.set(x, 0.06, z);
      this.raiz.add(g);
      this.carros.push({ g, sentido, vel: 5 + Math.random() * 5 });
    }
  }
  atualizar(dt) {
    for (const c of this.carros) {
      c.g.position.x += c.sentido * c.vel * dt;
      if (c.sentido > 0 && c.g.position.x > X1) c.g.position.x = X0;
      if (c.sentido < 0 && c.g.position.x < X0) c.g.position.x = X1;
    }
  }
}
