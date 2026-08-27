// Configuração das imagens BASE dos produtos (fotos reais, sem IA).
//
// Cada produto+cor aponta pra um arquivo em /img/produtos/<produto>/<cor>.png
// (ou .jpg). Enquanto a foto real não existe, o site desenha um retângulo
// de placeholder no lugar, só pra não travar o simulador — basta colocar o
// arquivo com o nome certo na pasta que ele passa a ser usado.
//
// "area" é a região onde a estampa é desenhada por padrão, em PORCENTAGEM
// do tamanho da imagem base (0 a 1) — assim funciona não importa a
// resolução da foto. O cliente pode arrastar/redimensionar a partir daí.
// Ajuste esses números pra casar com o peito da camiseta, o corpo da
// caneca etc. na sua foto real.

function slug(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// Área padrão genérica (estampa central, tipo "peito"). Serve de fallback
// pra qualquer produto que não tenha uma área específica definida abaixo.
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
