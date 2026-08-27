# Fotos base dos produtos

O simulador de estampas (página "Estampas") não usa mais IA pra gerar a
imagem. Ele pega uma foto real do produto (tirada de frente, fundo neutro)
e a estampa é colada em cima com `<canvas>`, direto no navegador.

## Onde colocar os arquivos

```
img/produtos/
  camiseta/
    branco.png
    preto.png
    cinza.png
    vermelho.png
    azul-marinho.png
    verde.png
  moletom/
    branco.png
    preto.png
    cinza-mescla.png
    vermelho.png
    azul-marinho.png
  caneca/
    branco.png
    preto.png
    vermelho.png
    azul.png
  bone/
    branco.png
    preto.png
    vermelho.png
    azul-marinho.png
    bege.png
  almofada/
    branco.png
    preto.png
    cinza.png
    bege.png
    vermelho.png
```

O nome do arquivo é o nome da cor em minúsculo, sem acento e com hífen no
lugar de espaço (ex.: "Azul marinho" → `azul-marinho.png`). Pode ser `.png`
ou trocar a extensão em `js/produtos-base.js` se preferir `.jpg`.

Enquanto o arquivo não existe, o site desenha um retângulo colorido no
lugar (com o nome do produto/cor escrito) só pra não travar — dá pra testar
o site inteiro sem nenhuma foto ainda.

## Ajustando onde a estampa cai

Em `js/produtos-base.js` tem um objeto `AREA_POR_PRODUTO` com a posição
padrão (em % da imagem) onde a estampa começa desenhada — por exemplo, o
peito da camiseta. Ajuste esses números pra bater com a foto de cada
produto. O cliente ainda pode arrastar/redimensionar a estampa por cima
disso antes de gerar a prévia, então não precisa ser perfeito.
