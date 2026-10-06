# Central de Oportunidades

A antiga página Clientes ABC agora reúne as abas **Oportunidades** e **Carteira ABC**. A rota interna `abc` foi preservada. A implementação é local; a prévia usa dados sintéticos e não acessa o banco de produção.

## Regras de comparação

- Conforme solicitado, cada análise compara um mês exclusivamente com o mês imediatamente anterior. Nunca substitui um mês ausente por outro mais antigo nem usa média histórica.
- O padrão é o último mês comercial encerrado que possui relatório mensal importado. O encerramento segue o calendário comercial existente, no fuso de São Paulo, a partir do dia seguinte ao fim do período. Em 2026, setembro termina em 2 de outubro.
- A queda mínima começa em 20% e pode ser ajustada para 10%, 20%, 30% ou 50%. O limite é inclusivo.
- Apenas vendedores com importações mensais `type2` nos dois meses participam. Ausência de relatório e falha de carregamento não são convertidas em zero. Uma importação mensal válida sem clientes representa zero.
- O sistema considera cada relatório `type2` como o mês inteiro. O modelo atual de importação não possui um campo que comprove a completude de um arquivo parcial; importar um relatório parcial como mensal pode afetar a análise. Essa convenção também aparece na explicação da tela.
- O histórico está limitado a 2026. Janeiro não pode ser comparado com dezembro de 2025 nesta implementação.

## Grupos de atenção

1. **Clientes para recuperar:** vendas líquidas positivas no mês anterior e valor líquido menor ou igual a zero no mês analisado. Valores negativos são preservados.
2. **Clientes com queda:** continuam com vendas líquidas positivas, mas a redução percentual alcança o limite escolhido.
3. **Clientes A em atenção:** eram curva A em pelo menos uma carteira de vendedor no mês anterior e estão em recuperação, apresentam queda de compras ou perderam participação relativa na carteira comparável acima do limite. A participação é o valor do cliente dividido pelo total dos mesmos vendedores; a queda relativa compara as duas participações, não pontos percentuais.
4. **Regiões com queda:** cidades cuja receita líquida reduziu pelo menos o limite escolhido, incluindo novos clientes e considerando os mesmos vendedores nos dois meses. A lista e os detalhes identificam os responsáveis e seus valores.

Os grupos se sobrepõem. As listas priorizam as maiores reduções em reais, depois a queda de participação. Os valores representam diferenças observadas, não previsão de faturamento recuperável. Um cliente pode perder participação mesmo mantendo suas compras quando a carteira cresce.

Clientes são consolidados pelo código entre vendedores, para não classificar uma transferência de carteira ou alteração de nome como perda. Registros antigos sem código usam nome e cidade normalizados; uma alteração nesses campos pode impedir a associação histórica. Clientes com registros sob vendedores sem cobertura completa ficam fora dos alertas de clientes. Cidades usam exclusivamente o conjunto comparável de vendedores.

Filtros de vendedor selecionam clientes ou cidades sob sua responsabilidade; os valores continuam consolidados entre os responsáveis. A busca abrange nome, código e cidade, ignorando acentos. A paginação mostra 10, 25 ou 50 resultados e não limita a busca. O histórico individual indica relatórios ausentes e meses ainda abertos.

## Carteira ABC preservada

A carteira mantém consulta mensal ou acumulada, vendedores, cidades, busca, ordenação, totais, curvas e gráfico dos maiores clientes. Agora os registros do mesmo código são agrupados antes da classificação; códigos diferentes com nomes iguais continuam separados. A acumulação usa mapas de identidade, sem buscas quadráticas nem alteração dos dados mensais.

Os critérios existentes foram preservados por cliente e vendedor: **A acima de R$ 2.000; B acima de R$ 500 até R$ 2.000; C até R$ 500**. Não se trata de classificação por percentuais acumulados de Pareto. Os cartões e totais refletem todos os registros filtrados, independentemente da página; um cliente atendido por dois vendedores aparece em duas linhas. O gráfico opcional usa os mesmos filtros, com Top 10 ou Top 20.

## Validação local

```powershell
npm run test:frontend
npm test --prefix backend
npm run preview:opportunities
```

A prévia abre em `http://127.0.0.1:8770`; acesse **Central de Oportunidades** no menu. Ela simula recuperação, queda, perda de participação, transferências, alterações de nomes, relatórios pendentes e cidades com vários vendedores. O banco de dados não é utilizado.

Testes cobrem os cálculos, limites de calendário e curvas, identidade, dados negativos, cobertura, filtros e respostas da API. Foram conferidos no navegador desktop e celular: paginação, busca global, histórico, acesso à ABC, gráfico e falhas de cobertura ou carregamento mensal. Cenários opcionais da prévia: `CENTRAL_PREVIEW_SCENARIO=coverage-error`, `month-error` ou `no-history`; a porta pode ser alterada com `SUMMARY_PREVIEW_PORT`.
