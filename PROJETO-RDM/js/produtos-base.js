// Configuração das imagens base dos produtos (fotos reais, sem IA).
// Cada produto+cor aponta para /img/produtos/<produto>/<cor>.png (ou .jpg);
// enquanto a foto real não existe, o simulador desenha um placeholder no
// lugar. "area" define a região padrão da estampa em porcentagem (0 a 1)
// do tamanho da imagem base, e o cliente pode arrastar/redimensionar a partir daí.

function slug(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

const AREA_PADRAO = { xPct: 0.32, yPct: 0.22, wPct: 0.36, hPct: 0.36 };

const AREA_POR_PRODUTO = {
    "Camiseta": { xPct: 0.34, yPct: 0.24, wPct: 0.32, hPct: 0.32 },
    "Moletom": { xPct: 0.34, yPct: 0.26, wPct: 0.32, hPct: 0.32 },
    "Caneca": { xPct: 0.30, yPct: 0.30, wPct: 0.40, hPct: 0.35 },
    "Boné": { xPct: 0.36, yPct: 0.30, wPct: 0.28, hPct: 0.22 },
    "Almofada": { xPct: 0.28, yPct: 0.28, wPct: 0.44, hPct: 0.44 }
};

export function caminhoImagemBase(produto, cor) {
    return `../img/produtos/${slug(produto)}/${slug(cor)}.png`;
}

export function areaPadraoEstampa(produto) {
    return AREA_POR_PRODUTO[produto] || AREA_PADRAO;
}
