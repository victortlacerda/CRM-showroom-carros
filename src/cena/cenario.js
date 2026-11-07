// Cenário: chão, rua, calçada, prédio (2 andares em corte), pátio, escada, mobiliário e letreiro.
import * as THREE from 'three';
import { mat, caixa, cilindro, grupo, placaTexto, fundirEstatico } from './util.js';
import {
  PREDIO, ESCRITORIO, CALCADA, RUA, MUNDO, ZONAS, MESAS_NEGOCIACAO, MESAS_VENDEDOR, ESCRITORIO_PONTOS, RECEPCAO_PONTOS,
} from './layout.js';

const COR = {
  grama: 0x8fc27a, asfalto: 0x4b525c, calcada: 0xd6d3cc, faixa: 0xf1ede0, parede: 0xf4efe6, paredeFundo: 0xe4ddd0,
  piso: 0xe9e6df, pisoOficina: 0x8b8f96, pisoLava: 0x7fb4cf, pisoEscritorio: 0xcdb89a, pisoRecepcao: 0xd9cdbb,
  vidro: 0x9fd3e8, estrutura: 0x2b3340, destaque: 0x2f6fed, madeira: 0xb98b5e, madeiraEscura: 0x7a5a3a,
};

export function construirCenario({ nomeLoja = 'Sua Loja de Veículos' } = {}) {
  const raiz = new THREE.Group();
  const luzes = { janelas: [], postes: [], letreiro: null, emissivos: [] }; // referências para o ciclo dia/noite

  // ---------- Chão ----------
  const chao = caixa(MUNDO.x0, MUNDO.x1, -0.6, 0, MUNDO.z0, MUNDO.z1, mat(COR.grama), { sombra: false });
  raiz.add(chao);
  // fundo da loja: terreno ligeiramente mais claro
  raiz.add(caixa(-96, 88, 0, 0.02, -62, 9, mat(0xb9c4b0), { sombra: false }));

  // ---------- Rua + calçada ----------
  raiz.add(caixa(MUNDO.x0, MUNDO.x1, 0, 0.12, CALCADA.z0, CALCADA.z1, mat(COR.calcada), { sombra: false })); // calçada
  raiz.add(caixa(MUNDO.x0, MUNDO.x1, 0.12, 0.2, CALCADA.z1 - 0.3, CALCADA.z1, mat(0xbcb8ae), { sombra: false })); // meio-fio
  raiz.add(caixa(MUNDO.x0, MUNDO.x1, 0, 0.06, RUA.z0, RUA.z1, mat(COR.asfalto), { sombra: false }));
  raiz.add(caixa(MUNDO.x0, MUNDO.x1, 0, 0.1, RUA.z1, MUNDO.z1, mat(COR.grama), { sombra: false }));
  const tracejado = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 0.02, 0.22), mat(COR.faixa), 40);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) { m4.setPosition(MUNDO.x0 + 4 + i * 4.6, 0.075, (RUA.faixaA + RUA.faixaB) / 2); tracejado.setMatrixAt(i, m4); }
  tracejado.receiveShadow = true; raiz.add(tracejado);
  // faixa de pedestres em frente à loja
  for (let i = 0; i < 7; i++) raiz.add(caixa(31 + i * 1.1, 31.7 + i * 1.1, 0.07, 0.09, RUA.z0, RUA.z1, mat(COR.faixa), { sombra: false }));

  // ---------- Pátio externo (estoque) ----------
  const p = ZONAS.patio;
  raiz.add(caixa(p.x0 - 1, p.x1 + 1, 0.02, 0.1, p.z0 - 1, p.z1 + 0.4, mat(0x5a626d), { sombra: false }));
  const linhas = new THREE.InstancedMesh(new THREE.BoxGeometry(p.x1 - p.x0, 0.02, 0.1), mat(0xe9e4d2), 16);
  for (let k = 0; k < 16; k++) { m4.setPosition((p.x0 + p.x1) / 2, 0.115, 6.25 - k * 3.5); linhas.setMatrixAt(k, m4); }
  raiz.add(linhas);
  const mCerca = mat(0x39424e);
  raiz.add(caixa(p.x0 - 1, p.x1 + 1, 0.1, 1.2, p.z0 - 1, p.z0 - 0.8, mCerca));
  raiz.add(caixa(p.x0 - 1, p.x0 - 0.8, 0.1, 1.2, p.z0 - 1, p.z1 + 0.4, mCerca));
  raiz.add(caixa(p.x1 + 0.8, p.x1 + 1, 0.1, 1.2, p.z0 - 1, p.z1 + 0.4, mCerca));
  raiz.add(caixa(p.x0 - 1, -61, 0.1, 1.2, p.z1 + 0.2, p.z1 + 0.4, mCerca), caixa(-51, p.x1 + 1, 0.1, 1.2, p.z1 + 0.2, p.z1 + 0.4, mCerca));
  const letPatio = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.8), placaTexto('PÁTIO · ESTOQUE', { w: 700, h: 126, fundo: '#243b55', fonte: 'bold 58px system-ui' }));
  letPatio.position.set(-56, 3.4, 6.5); raiz.add(letPatio);
  raiz.add(caixa(-61.2, -60.8, 0.1, 4.3, 6.3, 6.7, mCerca), caixa(-51.2, -50.8, 0.1, 4.3, 6.3, 6.7, mCerca));
  // lote de avaliação
  const a = ZONAS.avaliacao;
  raiz.add(caixa(a.x0 - 1, a.x1 + 1, 0.02, 0.1, a.z0 - 1, a.z1 + 1, mat(0x6a6f78), { sombra: false }));
  const letAval = new THREE.Mesh(new THREE.PlaneGeometry(12, 2), placaTexto('AVALIAÇÃO · TROCAS', { w: 600, h: 100, fundo: '#7a4b12', fonte: 'bold 46px system-ui' }));
  letAval.position.set(70, 3, -9.2); raiz.add(letAval);
  raiz.add(caixa(63.8, 64.1, 0.1, 3, -9.4, -9.1, mCerca), caixa(76.0, 76.3, 0.1, 3, -9.4, -9.1, mCerca));

  // ---------- Prédio ----------
  const { x0, x1, z0, z1, h1 } = PREDIO;
  const mParede = mat(COR.parede);
  const mFundo = mat(COR.paredeFundo);
  const mVidro = mat(COR.vidro, { opacity: 0.22, rough: 0.1, metal: 0.1, flat: false });
  const mEstr = mat(COR.estrutura, { metal: 0.3 });
  const esp = 0.35;

  // piso por zona
  const pisos = [
    ['recepcao', COR.pisoRecepcao], ['showroom', COR.piso], ['oficina', COR.pisoOficina], ['lavajato', COR.pisoLava],
  ];
  for (const [nome, cor] of pisos) {
    const r = ZONAS[nome];
    raiz.add(caixa(r.x0, r.x1, 0, 0.18, r.z0, r.z1, mat(cor, { rough: nome === 'showroom' ? 0.35 : 0.9 }), { sombra: false }));
  }
  // faixas de piso do showroom (xadrez sutil)
  const sh = ZONAS.showroom;
  for (let i = 0; i < 10; i++) raiz.add(caixa(sh.x0 + 2 + i * 4, sh.x0 + 2.08 + i * 4, 0.19, 0.2, sh.z0, sh.z1, mat(0xd2cec4), { sombra: false }));
  // chão sob os carros (palco) do showroom: tapete escuro
  raiz.add(caixa(sh.x0 + 1.2, sh.x1 - 1.2, 0.19, 0.22, -15, -1.9, mat(0xdad6cc, { rough: 0.3 }), { sombra: false }));

  // paredes: fundo (z0), lateral esquerda (x0), lateral direita (x1)
  raiz.add(caixa(x0, x1, 0, h1, z0, z0 + esp, mFundo));
  raiz.add(caixa(x0, x0 + esp, 0, h1, z0, z1, mParede));
  raiz.add(caixa(x1 - esp, x1, 0, h1, z0, z1, mParede));
  // divisórias entre zonas (com passagem larga) — recepção|showroom, showroom|oficina, oficina|lava-jato
  const divisoria = (x, passagem0, passagem1) => {
    raiz.add(caixa(x - 0.15, x + 0.15, 0, h1, z0, passagem0, mParede));
    raiz.add(caixa(x - 0.15, x + 0.15, 0, h1, passagem1, z1, mParede));
    raiz.add(caixa(x - 0.15, x + 0.15, 3.4, h1, passagem0, passagem1, mParede));
  };
  divisoria(-14, -2, 1.5);
  divisoria(26, -16, -16 + 0.01); // oficina separada do showroom por parede cheia (carros chegam pelos portões laterais)
  divisoria(46, -3, 0.6);
  // frente: vidro no showroom e na recepção; pilares
  const frente = (xa, xb, h = h1) => {
    raiz.add(caixa(xa, xb, 0.18, h, z1 - 0.06, z1 + 0.06, mVidro, { sombra: false }));
  };
  frente(-36, -14); frente(-14, 26);
  for (let x = -36; x <= 26; x += 4) raiz.add(caixa(x - 0.12, x + 0.12, 0, h1, z1 - 0.2, z1 + 0.2, mEstr));
  raiz.add(caixa(-36, 26, h1 - 0.5, h1, z1 - 0.2, z1 + 0.2, mEstr)); // viga superior
  // porta do showroom (abertura visual em x = 6)
  raiz.add(caixa(4.2, 7.8, 0, 3.2, z1 - 0.3, z1 + 0.3, mat(COR.destaque, { opacity: 0.0 }), { sombra: false }));
  raiz.add(caixa(4.0, 4.2, 0, 3.4, z1 - 0.3, z1 + 0.3, mEstr), caixa(7.8, 8.0, 0, 3.4, z1 - 0.3, z1 + 0.3, mEstr), caixa(4.0, 8.0, 3.2, 3.5, z1 - 0.3, z1 + 0.3, mEstr));
  // oficina e lava-jato: frente semiaberta (portões de enrolar abertos)
  const frenteGaragem = (xa, xb) => {
    raiz.add(caixa(xa, xb, 3.2, h1, z1 - 0.15, z1 + 0.15, mat(0xc9462c)));
    raiz.add(caixa(xa, xa + 0.5, 0, 3.2, z1 - 0.15, z1 + 0.15, mParede), caixa(xb - 0.5, xb, 0, 3.2, z1 - 0.15, z1 + 0.15, mParede));
    for (let k = 0; k < 6; k++) raiz.add(caixa(xa + 0.5, xb - 0.5, 3.0 + k * 0.03, 3.02 + k * 0.03, z1 - 0.1, z1 + 0.1, mEstr));
  };
  frenteGaragem(26, 46); frenteGaragem(46, 60);

  // letreiro grande acima do showroom
  const mLet = placaTexto(nomeLoja.toUpperCase(), { w: 1400, h: 120, fundo: '#10233f', fonte: 'bold 84px system-ui', emissivo: 0 });
  const letreiro = new THREE.Mesh(new THREE.BoxGeometry(20, 1.5, 0.4), [mFundo, mFundo, mFundo, mFundo, mLet, mFundo]);
  letreiro.position.set(7, h1 + 0.8, z1 - 0.1); letreiro.castShadow = true;
  raiz.add(letreiro); luzes.letreiro = mLet;
  raiz.add(caixa(-4, -3.6, h1, h1 + 0.2, z1 - 0.1, z1 + 0.1, mEstr), caixa(18, 18.4, h1, h1 + 0.2, z1 - 0.1, z1 + 0.1, mEstr));
  const letOficina = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), placaTexto('OFICINA', { w: 600, h: 110, fundo: '#c9462c', fonte: 'bold 70px system-ui' }));
  letOficina.position.set(36, 4.2, z1 + 0.2); raiz.add(letOficina);
  const letLava = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), placaTexto('LAVA-JATO', { w: 600, h: 110, fundo: '#1c7fb8', fonte: 'bold 70px system-ui' }));
  letLava.position.set(53, 4.2, z1 + 0.2); raiz.add(letLava);
  // fachada da recepção
  const letRecep = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), placaTexto('RECEPÇÃO', { w: 420, h: 80, fundo: '#7b5e57', fonte: 'bold 52px system-ui' }));
  letRecep.position.set(-24, 4.1, z1 + 0.25); raiz.add(letRecep);

  // ---------- Escritório (2º andar, só sobre a recepção) ----------
  const E = ESCRITORIO;
  raiz.add(caixa(E.x0, E.x1, 5.0, 5.2, E.z0, E.z1, mat(0x6b5f55)));                 // laje
  raiz.add(caixa(E.x0, E.x1, 5.2, 5.24, E.z0, E.z1, mat(COR.pisoEscritorio), { sombra: false })); // piso
  const hEsc = 4.6;
  raiz.add(caixa(E.x0, E.x1, E.y, E.y + hEsc, E.z0, E.z0 + 0.3, mFundo));              // fundo
  raiz.add(caixa(E.x0, E.x0 + 0.3, E.y, E.y + hEsc, E.z0, E.z1, mParede));             // esquerda
  raiz.add(caixa(E.x1 - 0.3, E.x1, E.y, E.y + 1.0, E.z0, E.z1, mParede));              // direita (baixa: vemos o interior)
  raiz.add(caixa(E.x1 - 0.3, E.x1, E.y + 1.0, E.y + hEsc, E.z0, E.z1, mVidro, { sombra: false }));
  // frente de vidro do escritório com porta em x = -28
  raiz.add(caixa(E.x0, -29.2, E.y, E.y + hEsc, E.z1 - 0.1, E.z1 + 0.05, mVidro, { sombra: false }));
  raiz.add(caixa(-26.8, E.x1, E.y, E.y + hEsc, E.z1 - 0.1, E.z1 + 0.05, mVidro, { sombra: false }));
  raiz.add(caixa(-29.2, -26.8, E.y + 3.0, E.y + hEsc, E.z1 - 0.1, E.z1 + 0.05, mVidro, { sombra: false }));
  for (const x of [-36, -29.2, -26.8, -14]) raiz.add(caixa(x - 0.1, x + 0.1, E.y, E.y + hEsc, E.z1 - 0.15, E.z1 + 0.1, mEstr));
  raiz.add(caixa(E.x0, E.x1, E.y + hEsc - 0.12, E.y + hEsc, E.z1 - 0.15, E.z1 + 0.1, mEstr));
  // teto baixo translúcido (cortado no diorama: não bloqueia a vista)
  const sacada = grupo(
    caixa(-31, -26, 5.0, 5.2, 4, 6.4, mat(0x6b5f55)),
    caixa(-31, -26, 6.1, 6.2, 6.3, 6.4, mEstr),
  );
  raiz.add(sacada);
  const letEsc = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.0), placaTexto('ESCRITÓRIO', { w: 420, h: 72, fundo: '#243b55', fonte: 'bold 48px system-ui' }));
  letEsc.position.set(-33.2, 9.2, E.z1 + 0.2); raiz.add(letEsc);

  // escada externa até a sacada
  const mDegrau = mat(0x8a8f98);
  const nDeg = 26;
  for (let i = 0; i < nDeg; i++) {
    const x = -14 - (i + 0.5) * (13 / nDeg);
    const y = (i + 1) * (5.2 / nDeg);
    raiz.add(caixa(x - 0.26, x + 0.26, 0, y, 4.5, 6.3, mDegrau));
  }
  const corrimao = (z) => {
    raiz.add(caixa(-27.4, -13.8, 0.0, 0.0, z, z, mEstr));
    const g = new THREE.Mesh(new THREE.BoxGeometry(13.9, 0.08, 0.08), mEstr);
    g.position.set(-20.6, 3.2, z); g.rotation.z = Math.atan2(5.2, 13) * -1; // inclinação
    g.position.y = 2.9 + 1.1 + 0.2 - 1.5; raiz.add(g);
  };
  corrimao(6.35); corrimao(4.55);
  for (const t of [0.0, 0.25, 0.5, 0.75, 1.0]) for (const z of [6.35, 4.55]) {
    const x = -14 - t * 13; const y = t * 5.2;
    raiz.add(caixa(x - 0.04, x + 0.04, y, y + 1.0, z - 0.04, z + 0.04, mEstr));
  }

  // ---------- Mobiliário ----------
  raiz.add(mobiliarioShowroom(luzes));
  raiz.add(mobiliarioRecepcao());
  raiz.add(mobiliarioEscritorio(luzes));
  raiz.add(mobiliarioOficina());
  raiz.add(mobiliarioLavaJato());
  raiz.add(exterior(luzes));

  fundirEstatico(raiz);
  return { raiz, luzes };
}

// ---------------------------------------------------------------------------
function mesaBasica(w, d, h, cor = COR.madeira) {
  const g = new THREE.Group();
  g.add(caixa(-w / 2, w / 2, h - 0.08, h, -d / 2, d / 2, mat(cor)));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(caixa(sx * (w / 2 - 0.1) - 0.04, sx * (w / 2 - 0.1) + 0.04, 0, h - 0.08, sz * (d / 2 - 0.1) - 0.04, sz * (d / 2 - 0.1) + 0.04, mat(0x2b3340)));
  return g;
}
function cadeira(cor = 0x2f6fed, rot = 0) {
  const g = new THREE.Group();
  g.add(caixa(-0.25, 0.25, 0.42, 0.5, -0.25, 0.25, mat(cor)));
  g.add(caixa(-0.25, 0.25, 0.5, 1.0, -0.28, -0.2, mat(cor)));
  g.add(caixa(-0.04, 0.04, 0, 0.42, -0.04, 0.04, mat(0x2b3340)));
  g.rotation.y = rot;
  return g;
}
function monitor() {
  const g = new THREE.Group();
  g.add(caixa(-0.3, 0.3, 0.0, 0.35, -0.2, 0.0, mat(0x14181f)));
  g.add(caixa(-0.03, 0.03, -0.15, 0.0, -0.12, -0.06, mat(0x2b3340)));
  return g;
}
function planta(x, y, z) {
  const g = new THREE.Group();
  g.add(cilindro(0.3, 0.5, mat(0xb06a3b), 8)).position.y = 0.25;
  const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat(0x3f9a54));
  f.position.y = 0.95; f.castShadow = true; g.add(f);
  g.position.set(x, y, z);
  return g;
}

function mobiliarioShowroom() {
  const g = new THREE.Group();
  // mesas dos vendedores (encostadas na frente) com monitor
  for (const m of MESAS_VENDEDOR) {
    const mesa = mesaBasica(1.8, 0.8, 0.75, 0xd9d4c8); mesa.position.set(m.x, 0.18, m.z); g.add(mesa);
    const mon = monitor(); mon.position.set(m.x, 0.93, m.z + 0.1); mon.rotation.y = Math.PI; g.add(mon);
    const cad = cadeira(0x2b3340, 0); cad.position.set(m.x, 0.18, m.z - 0.9); g.add(cad);
  }
  // mesas de negociação (cliente em x-0.9, vendedor em x+0.9)
  for (const m of MESAS_NEGOCIACAO) {
    const mesa = mesaBasica(0.9, 1.3, 0.75, COR.madeira); mesa.position.set(m.x, 0.18, m.z); g.add(mesa);
    const c1 = cadeira(0x2f6fed, Math.PI / 2); c1.position.set(m.x - 0.95, 0.18, m.z); g.add(c1);
    const c2 = cadeira(0x2b3340, -Math.PI / 2); c2.position.set(m.x + 0.95, 0.18, m.z); g.add(c2);
    const doc = caixa(m.x - 0.2, m.x + 0.2, 0.94, 0.96, m.z - 0.3, m.z + 0.3, mat(0xffffff)); g.add(doc);
  }
  // plantas e bebedouro
  [[-13, 3.2], [25, 3.2], [-13, -15], [25, -15]].forEach(([x, z]) => g.add(planta(x, 0.18, z)));
  // faixas de destaque no chão sob cada fileira de carros (podium)
  return g;
}

function mobiliarioRecepcao() {
  const g = new THREE.Group();
  const bx = RECEPCAO_PONTOS.balcao;
  g.add(caixa(bx.x - 3, bx.x + 3, 0.18, 1.15, bx.z - 0.6, bx.z + 0.6, mat(0x7b5e57)));
  g.add(caixa(bx.x - 3, bx.x + 3, 1.15, 1.22, bx.z - 0.7, bx.z + 0.7, mat(0xf4efe6)));
  const mon = monitor(); mon.position.set(bx.x - 1, 1.22, bx.z + 0.2); g.add(mon);
  const sofa = RECEPCAO_PONTOS.sofa;
  g.add(caixa(sofa.x - 0.5, sofa.x + 0.5, 0.18, 0.55, sofa.z - 1.4, sofa.z + 1.4, mat(0x2f6fed)));
  g.add(caixa(sofa.x - 0.6, sofa.x - 0.4, 0.55, 1.1, sofa.z - 1.4, sofa.z + 1.4, mat(0x2a5fcf)));
  g.add(caixa(sofa.x + 0.9, sofa.x + 1.7, 0.18, 0.5, sofa.z - 0.5, sofa.z + 0.5, mat(0xf4efe6)));
  g.add(planta(-35, 0.18, 3), planta(-15, 0.18, -15));
  const cr = cadeira(0x2b3340, 0); cr.position.set(RECEPCAO_PONTOS.recepcionista.x, 0.18, RECEPCAO_PONTOS.recepcionista.z); g.add(cr);
  return g;
}

function mobiliarioEscritorio(luzes) {
  const g = new THREE.Group();
  const y = ESCRITORIO.y + 0.04;
  const P = ESCRITORIO_PONTOS;
  // mesa de reunião
  const mr = mesaBasica(3.2, 1.8, 0.75, COR.madeiraEscura); mr.position.set(P.mesaReuniao.x, y, P.mesaReuniao.z); g.add(mr);
  P.assentosReuniao.forEach((a, i) => { const c = cadeira(0x2b3340, i < 2 ? 0 : Math.PI); c.position.set(a.x, y, a.z + (i < 2 ? -0.2 : 0.2)); g.add(c); });
  // mesa do financeiro
  const mf = mesaBasica(2.2, 1.0, 0.75, 0xd9d4c8); mf.position.set(P.financeiro.x, y, P.financeiro.z - 0.3); g.add(mf);
  const mon = monitor(); mon.position.set(P.financeiro.x, y + 0.75, P.financeiro.z - 0.5); g.add(mon);
  const cf = cadeira(0x2b3340, Math.PI); cf.position.set(P.financeiro.x, y, P.financeiro.z + 0.6); g.add(cf);
  for (const v of P.financeiroVisitante) { const c = cadeira(0x2f6fed, Math.PI); c.position.set(v.x, y, v.z); g.add(c); }
  // mesa do gerente
  const mg = mesaBasica(2.4, 1.1, 0.75, COR.madeiraEscura); mg.position.set(P.gerente.x, y, P.gerente.z - 0.3); g.add(mg);
  const mon2 = monitor(); mon2.position.set(P.gerente.x, y + 0.75, P.gerente.z - 0.5); g.add(mon2);
  const cg = cadeira(0xc9462c, Math.PI); cg.position.set(P.gerente.x, y, P.gerente.z + 0.5); g.add(cg);
  // estantes e plantas
  g.add(caixa(-35.7, -35.3, y, y + 3.2, -15, -9, mat(0x7a5a3a)));
  for (let i = 0; i < 4; i++) g.add(caixa(-35.3, -35.0, y + 0.5 + i * 0.7, y + 0.58 + i * 0.7, -15, -9, mat(0xf4efe6)));
  g.add(planta(-15.5, y, -15), planta(-35, y, 3), planta(-15.5, y, 2.5));
  return g;
}

function mobiliarioOficina() {
  const g = new THREE.Group();
  // elevadores/rampas (macacos) sob alguns carros e bancadas ao fundo
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * 6.5;
    g.add(caixa(x - 1.3, x + 1.3, 0.18, 0.5, -15.4, -14.6, mat(0xc9462c)));
    g.add(caixa(x - 1.3, x + 1.3, 0.5, 0.58, -15.4, -14.4, mat(0x2b3340)));
  }
  g.add(caixa(41, 45.6, 0.18, 1.0, -15.5, -14.2, mat(0x7a5a3a)));
  g.add(caixa(41, 45.6, 1.0, 1.1, -15.6, -14.1, mat(0xd9d4c8)));
  // carrinho de ferramentas
  for (const [x, z] of [[27.2, -14.8], [27.2, -3.2]]) {
    g.add(caixa(x - 0.4, x + 0.4, 0.18, 1.0, z - 0.3, z + 0.3, mat(0xc9462c)));
    g.add(caixa(x - 0.4, x + 0.4, 1.0, 1.06, z - 0.32, z + 0.32, mat(0x2b3340)));
  }
  // pilha de pneus
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.17, 6, 12), mat(0x1d1f23)); t.rotation.x = Math.PI / 2;
    t.position.set(44.8, 0.35 + i * 0.34, 3.0 - 6); t.castShadow = true; g.add(t);
  }
  return g;
}

function mobiliarioLavaJato() {
  const g = new THREE.Group();
  // baias com tapete de lavagem, espuma e mangueiras
  for (const x of [49.5, 56]) {
    for (const z of [-12.5, -8.5, -4.5, -0.5]) g.add(caixa(x - 2.4, x + 2.4, 0.18, 0.2, z - 1.2, z + 1.2, mat(0x3f86ad), { sombra: false }));
  }
  g.add(caixa(52.6, 52.9, 0.18, 2.6, -15.6, -15.2, mat(0x2b3340)));
  g.add(caixa(52.6, 59.5, 2.6, 2.75, -15.6, -15.2, mat(0x2b3340)));
  for (const x of [54, 57.5]) {
    const bico = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), mat(0x4cc9f0)); bico.position.set(x, 2.25, -15.2); bico.rotation.x = Math.PI; g.add(bico);
  }
  // balde, tonel de produtos
  for (const [x, z] of [[47.2, 2], [59.3, 2]]) g.add(cilindro(0.45, 0.9, mat(0x1c7fb8), 10)).position.set(x, 0.65, z);
  return g;
}

function exterior(luzes) {
  const g = new THREE.Group();
  // postes de luz na calçada
  for (let x = -90; x <= 70; x += 20) {
    const poste = new THREE.Group();
    poste.add(caixa(-0.1, 0.1, 0, 5.2, -0.1, 0.1, mat(0x2b3340)));
    poste.add(caixa(-0.1, 1.0, 5.1, 5.2, -0.1, 0.1, mat(0x2b3340)));
    const lm = mat(0xfff0c0, { emissive: 0xffe39a, emissiveIntensity: 0.0 });
    poste.add(caixa(0.7, 1.2, 4.95, 5.1, -0.2, 0.2, lm, { sombra: false }));
    luzes.emissivos.push({ mat: lm, noite: 2.2 });
    poste.position.set(x, 0.12, CALCADA.z1 - 1.0); g.add(poste);
  }
  // árvores
  for (let x = -94; x <= 74; x += 12) {
    if (Math.abs(x - 6) < 6) continue;
    const t = new THREE.Group();
    t.add(cilindro(0.2, 1.8, mat(0x6b4a2f), 6)).position.y = 0.9;
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), mat(0x4aa35c)); c.position.y = 2.5; c.castShadow = true; t.add(c);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), mat(0x3f9a54)); c2.position.set(0.5, 3.1, 0.2); c2.castShadow = true; t.add(c2);
    t.position.set(x + 4, 0.12, CALCADA.z0 + 0.7); g.add(t);
  }
  // bandeirolas na frente da loja
  for (let i = 0; i < 8; i++) {
    const f = caixa(-13 + i * 2.5, -12.4 + i * 2.5, 3.9, 4.4, 8.15, 8.2, mat(i % 2 ? 0xe0b82a : 0xc9462c), { sombra: false }); g.add(f);
  }
  return g;
}
