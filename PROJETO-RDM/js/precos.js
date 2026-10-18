// Tabela de preços do simulador de estampas.
// >>> EDITE AQUI os valores (em reais). Os números abaixo são EXEMPLOS. <<<
//
// Preço final = preço do material + acréscimo do tamanho.
// Os nomes de produto, material e tamanho precisam ser idênticos aos do
// CATALOGO_PRODUTOS em estampas.js.

export const PRECOS = {
    "Camiseta": {
        materiais: { "Algodão": 39.90, "Poliéster (Dry-fit)": 44.90, "Malha PV": 34.90 },
        tamanhos:  { "PP": 0, "P": 0, "M": 0, "G": 3, "GG": 5, "XG": 8 }
    },
    "Moletom": {
        materiais: { "Moletom flanelado": 89.90, "Moletom peluciado": 99.90, "Algodão": 84.90 },
        tamanhos:  { "P": 0, "M": 0, "G": 5, "GG": 8, "XG": 12 }
    },
    "Caneca": {
        materiais: { "Cerâmica branca": 29.90, "Cerâmica mágica (muda de cor)": 39.90, "Inox": 49.90 },
        tamanhos:  { "Única (325ml)": 0 }
    },
    "Boné": {
        materiais: { "Sarja": 34.90, "Brim": 37.90, "Tactel": 32.90 },
        tamanhos:  { "Único (ajustável)": 0 }
    }
};

export function calcularPreco(produto, material, tamanho) {
    const tabela = PRECOS[produto];
    if (!tabela) return null;
    const base = tabela.materiais[material];
    if (base === undefined) return null;
    return base + (tabela.tamanhos[tamanho] || 0);
}

export function formatarReais(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
